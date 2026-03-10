import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Match, MatchPrediction, Group } from '../models/index';
import Notification from '../models/Notification';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';
import type { IMatchResult } from '../models/Match';
import { notifyUsers } from '../socket';

const router = Router();

router.use(protect);

// ── Points calculation ─────────────────────────────────────────────────────────

const calcPoints = (picks: MatchPrediction['picks'], result: IMatchResult): number => {
  let pts = 0;
  if (result.winner && picks.winner === result.winner) pts += 1;
  if (result.topBatter?.length && result.topBatter.includes(picks.topBatter)) pts += 3;
  if (result.topBowler?.length && result.topBowler.includes(picks.topBowler)) pts += 3;
  if (result.playerOfMatch?.length && result.playerOfMatch.includes(picks.playerOfMatch)) pts += 5;
  if (result.powerplayScoreA !== null)
    pts += Math.max(0, 5 - Math.abs(picks.powerplayScoreA - result.powerplayScoreA!));
  if (result.powerplayScoreB !== null)
    pts += Math.max(0, 5 - Math.abs(picks.powerplayScoreB - result.powerplayScoreB!));
  return pts;
};

type MatchPrediction = import('../models/MatchPrediction').IMatchPrediction;

// ── List matches for a tournament ─────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { tournamentId } = req.query as { tournamentId?: string };
  if (!tournamentId) { res.status(400).json({ message: 'tournamentId is required' }); return; }
  const matches = await Match.find({ tournament: tournamentId }).sort({ matchNumber: 1 });
  res.json({ matches });
});

// ── Get single match ──────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const match = await Match.findById(req.params['id']);
  if (!match) { res.status(404).json({ message: 'Match not found' }); return; }
  res.json({ match });
});

// ── Create match (admin only) ─────────────────────────────────────────────────

router.post(
  '/',
  [
    body('tournamentId').notEmpty(),
    body('matchNumber').isInt({ min: 1 }),
    body('teamA').notEmpty(),
    body('teamB').notEmpty(),
    body('scheduledAt').notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin') { res.status(403).json({ message: 'Admin only' }); return; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { tournamentId, matchNumber, teamA, teamB, venue, scheduledAt } = req.body as {
      tournamentId: string; matchNumber: number; teamA: string; teamB: string;
      venue?: string; scheduledAt: string;
    };

    const match = await Match.create({
      tournament: tournamentId,
      matchNumber,
      teamA,
      teamB,
      venue: venue || '',
      scheduledAt: new Date(scheduledAt),
    });

    res.status(201).json({ match });
  }
);

// ── Update match status + result (admin only) ─────────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'admin') { res.status(403).json({ message: 'Admin only' }); return; }

  const match = await Match.findById(req.params['id']);
  if (!match) { res.status(404).json({ message: 'Match not found' }); return; }

  const { status, result, teamA, teamB, venue, scheduledAt } = req.body as {
    status?: 'upcoming' | 'live' | 'completed';
    result?: Partial<IMatchResult>;
    teamA?: string; teamB?: string; venue?: string; scheduledAt?: string;
  };

  if (teamA) match.teamA = teamA;
  if (teamB) match.teamB = teamB;
  if (venue !== undefined) match.venue = venue;
  if (scheduledAt) match.scheduledAt = new Date(scheduledAt);
  if (status) match.status = status;
  if (result) {
    match.result = { ...match.result, ...result } as IMatchResult;
  }

  await match.save();

  // When match completes with a result, calculate points and notify each member
  if (status === 'completed' && result) {
    const finalResult = match.result as IMatchResult;
    const predictions = await MatchPrediction.find({ match: match._id });
    const matchLabel = `Match ${match.matchNumber} (${match.teamA} vs ${match.teamB})`;

    await Promise.all(
      predictions.map(async (pred) => {
        pred.points = calcPoints(pred.picks as any, finalResult);
        await pred.save();

        // Create notification then populate group name for the socket payload
        const notif = new Notification({
          user: pred.user,
          group: pred.group,
          match: match._id,
          type: 'match_result' as const,
          message: `Results are in for ${matchLabel}! You scored ${pred.points} pts.`,
        });
        await notif.save();
        await notif.populate('group', 'name');

        // Emit only to this specific user
        notifyUsers([pred.user.toString()], 'notification', {
          _id: notif._id,
          message: notif.message,
          type: notif.type,
          read: false,
          createdAt: notif.createdAt,
          group: notif.group,
          match: notif.match,
        });
      })
    );
  }

  res.json({ match });
});

// ── Get my prediction for a match ─────────────────────────────────────────────

router.get('/:matchId/my-prediction', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.query as { groupId?: string };
  if (!groupId) { res.status(400).json({ message: 'groupId is required' }); return; }

  const prediction = await MatchPrediction.findOne({
    user: req.user!.id,
    match: req.params['matchId'],
    group: groupId,
  });

  if (!prediction) { res.status(404).json({ message: 'No prediction found' }); return; }
  res.json({ prediction });
});

// ── Submit / update my prediction ─────────────────────────────────────────────

router.post(
  '/:matchId/predict',
  [
    body('groupId').notEmpty(),
    body('picks.winner').notEmpty(),
    body('picks.topBatter').notEmpty(),
    body('picks.topBowler').notEmpty(),
    body('picks.playerOfMatch').notEmpty(),
    body('picks.powerplayScoreA').isInt({ min: 0, max: 120 }),
    body('picks.powerplayScoreB').isInt({ min: 0, max: 120 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { groupId, picks } = req.body as {
      groupId: string;
      picks: {
        winner: string; topBatter: string; topBowler: string;
        playerOfMatch: string; powerplayScoreA: number; powerplayScoreB: number;
      };
    };

    const match = await Match.findById(req.params['matchId']);
    if (!match) { res.status(404).json({ message: 'Match not found' }); return; }
    if (match.status !== 'upcoming') {
      res.status(400).json({ message: 'Predictions are locked — match has already started' }); return;
    }

    // Predictions open 24 hours before the match
    const hoursUntil = (match.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 24) {
      const opensInHours = Math.ceil(hoursUntil - 24);
      res.status(400).json({
        message: `Predictions open in ${opensInHours} hour${opensInHours !== 1 ? 's' : ''}`,
        opensAt: new Date(match.scheduledAt.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      });
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) { res.status(404).json({ message: 'Group not found' }); return; }
    if (!group.enableMatchPredictions) {
      res.status(400).json({ message: 'Match predictions are not enabled for this group' }); return;
    }
    const isMember = group.members.some((m) => m.toString() === req.user!.id);
    if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

    // Upsert
    const prediction = await MatchPrediction.findOneAndUpdate(
      { user: req.user!.id, match: req.params['matchId'], group: groupId },
      { picks, submittedAt: new Date(), points: null },
      { upsert: true, new: true }
    );

    res.json({ prediction });
  }
);

// ── Get all predictions for a match in a group (after match ends) ─────────────

router.get('/:matchId/predictions', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.query as { groupId?: string };
  if (!groupId) { res.status(400).json({ message: 'groupId is required' }); return; }

  const match = await Match.findById(req.params['matchId']);
  if (!match) { res.status(404).json({ message: 'Match not found' }); return; }
  if (match.status === 'upcoming') {
    res.status(403).json({ message: 'Picks are hidden until the match starts' }); return;
  }

  // Verify requester is a group member
  const group = await Group.findById(groupId);
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }
  const isMember = group.members.some((m) => m.toString() === req.user!.id);
  if (!isMember) { res.status(403).json({ message: 'Not a member' }); return; }

  const predictions = await MatchPrediction.find({ match: req.params['matchId'], group: groupId })
    .populate('user', 'name username');

  res.json({ predictions });
});

export default router;
