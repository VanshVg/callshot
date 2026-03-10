import { Router, Response } from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { Prediction, Group, Tournament, StrategyCard } from '../models/index';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect);

router.post(
  '/',
  [
    body('groupId').notEmpty(),
    body('tournamentId').notEmpty(),
    body('picks').isArray({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { groupId, tournamentId, picks } = req.body as { groupId: string; tournamentId: string; picks: { category: string; selections: string[] }[] };

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
    if (tournament.status !== 'upcoming') {
      res.status(400).json({ message: 'Predictions are locked — tournament has started' });
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) { res.status(404).json({ message: 'Group not found' }); return; }
    const isMember = group.members.some((m) => m.toString() === req.user!.id);
    if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

    const existing = await Prediction.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
    if (existing) {
      // Update existing prediction — allowed until tournament starts
      existing.picks = picks as any;
      existing.submittedAt = new Date();
      await existing.save();
      res.json({ prediction: existing });
      return;
    }

    const prediction = await Prediction.create({
      user: req.user!.id,
      group: groupId,
      tournament: tournamentId,
      picks,
      locked: false,
    });

    // Initialise 4 strategy cards on first submission
    await StrategyCard.create({
      user: req.user!.id,
      group: groupId,
      tournament: tournamentId,
      cards: [
        { type: 'swap', used: false, usedAt: null, details: null },
        { type: 'swap', used: false, usedAt: null, details: null },
        { type: 'swap', used: false, usedAt: null, details: null },
        { type: 'swap', used: false, usedAt: null, details: null },
      ],
    });

    res.status(201).json({ prediction });
  }
);

router.get('/:groupId/:tournamentId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, tournamentId } = req.params as { groupId: string; tournamentId: string };
  const prediction = await Prediction.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId })
    .populate('picks.category', 'name type selectionCount');
  if (!prediction) { res.status(404).json({ message: 'No prediction found' }); return; }
  res.json({ prediction });
});

router.get('/:groupId/:tournamentId/all', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, tournamentId } = req.params as { groupId: string; tournamentId: string };

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  if (tournament.status === 'upcoming') {
    res.status(403).json({ message: 'Predictions are revealed once the tournament starts' });
    return;
  }

  const predictions = await Prediction.find({ group: groupId, tournament: tournamentId })
    .populate('user', 'name username')
    .populate('picks.category', 'name type');
  res.json({ predictions });
});

export default router;
