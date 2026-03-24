import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ActualResult, Tournament, Category, Match, Group } from '../models/index';
import CategoryModel from '../models/Category';
import StrategyCard from '../models/StrategyCard';
import { protect, adminOnly } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect, adminOnly);

// ── Tournaments ────────────────────────────────────────────────────────────────

router.get('/tournaments', async (_req: Request, res: Response) => {
  const tournaments = await Tournament.find().sort({ startDate: -1 });
  res.json({ tournaments });
});

router.post('/tournaments', async (req: Request, res: Response): Promise<void> => {
  const { name, sport, type, season, totalMatches, startDate, endDate } = req.body as {
    name: string; sport?: string; type: string; season: string;
    totalMatches: number; startDate: string; endDate: string;
  };
  if (!name || !type || !season || !startDate || !endDate) {
    res.status(400).json({ message: 'name, type, season, startDate, endDate are required' });
    return;
  }
  const tournament = await Tournament.create({
    name, sport: sport || 'cricket', type, season,
    totalMatches: totalMatches || 0,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status: 'upcoming',
  });
  res.status(201).json({ tournament });
});

router.put('/tournaments/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, sport, type, season, totalMatches, startDate, endDate, cardsEnabled } = req.body as {
    name?: string; sport?: string; type?: string; season?: string;
    totalMatches?: number; startDate?: string; endDate?: string; cardsEnabled?: boolean;
  };
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (sport !== undefined) update.sport = sport;
  if (type !== undefined) update.type = type;
  if (season !== undefined) update.season = season;
  if (totalMatches !== undefined) update.totalMatches = totalMatches;
  if (startDate !== undefined) update.startDate = new Date(startDate);
  if (endDate !== undefined) update.endDate = new Date(endDate);
  if (cardsEnabled !== undefined) update.cardsEnabled = cardsEnabled;

  const tournament = await Tournament.findByIdAndUpdate(req.params['id'], update, { new: true });
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  res.json({ tournament });
});

router.put('/tournaments/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  const tournament = await Tournament.findByIdAndUpdate(req.params['id'], { status }, { new: true });
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  res.json({ tournament });
});

router.delete('/tournaments/:id', async (req: Request, res: Response): Promise<void> => {
  const tournament = await Tournament.findByIdAndDelete(req.params['id']);
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  // Clean up related data
  await Match.deleteMany({ tournament: req.params['id'] });
  await ActualResult.deleteMany({ tournament: req.params['id'] });
  res.json({ message: 'Tournament deleted' });
});

// ── Teams & Squads ─────────────────────────────────────────────────────────────

router.put('/tournaments/:id/squads', async (req: Request, res: Response): Promise<void> => {
  const { teams, squads } = req.body as {
    teams: string[];
    squads: Record<string, string[]>;
  };
  const squadsMap = new Map(Object.entries(squads));
  const tournament = await Tournament.findByIdAndUpdate(
    req.params['id'],
    { teams, squads: squadsMap },
    { new: true }
  );
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  res.json({ tournament });
});

// ── Categories (admin) ─────────────────────────────────────────────────────────

router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  const sport = (req.query['sport'] as string) || 'cricket';
  const categories = await CategoryModel.find({ sport }).sort({ order: 1 });
  res.json({ categories });
});

router.put('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, description, type, selectionCount, scoringType, order } = req.body as {
    name?: string; description?: string;
    type?: 'player_stat' | 'team_position' | 'single_player';
    selectionCount?: number; scoringType?: 'positional' | 'exact_match'; order?: number;
  };
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (type !== undefined) update.type = type;
  if (selectionCount !== undefined) update.selectionCount = selectionCount;
  if (scoringType !== undefined) update.scoringType = scoringType;
  if (order !== undefined) update.order = order;

  const category = await CategoryModel.findByIdAndUpdate(req.params['id'], update, { new: true });
  if (!category) { res.status(404).json({ message: 'Category not found' }); return; }
  res.json({ category });
});

// ── Matches (admin) ────────────────────────────────────────────────────────────

router.post('/matches', async (req: Request, res: Response): Promise<void> => {
  const { tournamentId, matchNumber, teamA, teamB, venue, scheduledAt } = req.body as {
    tournamentId: string; matchNumber: number; teamA: string; teamB: string;
    venue?: string; scheduledAt: string;
  };
  if (!tournamentId || !matchNumber || !teamA || !teamB || !scheduledAt) {
    res.status(400).json({ message: 'tournamentId, matchNumber, teamA, teamB, scheduledAt required' });
    return;
  }
  const match = await Match.create({ tournament: tournamentId, matchNumber, teamA, teamB, venue, scheduledAt });
  res.status(201).json({ match });
});

router.post('/matches/bulk', async (req: Request, res: Response): Promise<void> => {
  const { tournamentId, matches } = req.body as {
    tournamentId: string;
    matches: { matchNumber: number; teamA: string; teamB: string; venue?: string; scheduledAt: string }[];
  };
  if (!tournamentId || !Array.isArray(matches) || matches.length === 0) {
    res.status(400).json({ message: 'tournamentId and matches[] required' });
    return;
  }
  const docs = matches.map((m) => ({ ...m, tournament: tournamentId }));
  const created = await Match.insertMany(docs, { ordered: false });
  res.status(201).json({ count: created.length, matches: created });
});

router.delete('/matches/:id', async (req: Request, res: Response): Promise<void> => {
  await Match.findByIdAndDelete(req.params['id']);
  res.json({ message: 'Match deleted' });
});

// ── Results ────────────────────────────────────────────────────────────────────

router.post(
  '/results',
  [
    body('tournamentId').notEmpty(),
    body('categoryId').notEmpty(),
    body('rankings').isArray({ min: 1, max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { tournamentId, categoryId, rankings } = req.body as {
      tournamentId: string;
      categoryId: string;
      rankings: { position: number; name: string }[];
    };

    const result = await ActualResult.findOneAndUpdate(
      { tournament: tournamentId, category: categoryId },
      { rankings },
      { upsert: true, new: true }
    );

    res.json({ result });
  }
);

router.get('/results/:tournamentId', async (req: Request, res: Response) => {
  const results = await ActualResult.find({ tournament: req.params['tournamentId'] })
    .populate('category', 'name type order');
  res.json({ results });
});

// ── Groups + card history (admin) ──────────────────────────────────────────────

router.get('/tournament-groups/:tournamentId', async (req: Request, res: Response): Promise<void> => {
  const { tournamentId } = req.params as { tournamentId: string };

  const groups = await Group.find({ tournament: tournamentId })
    .populate<{ members: { _id: { toString(): string }; name: string; username: string }[] }>(
      'members', 'name username'
    )
    .lean();

  const groupIds = groups.map((g) => g._id);
  const allCards = await StrategyCard.find({ tournament: tournamentId, group: { $in: groupIds } }).lean();

  const cardMap = new Map<string, typeof allCards[0]['cards']>();
  for (const sc of allCards) {
    cardMap.set(`${sc.user.toString()}_${sc.group.toString()}`, sc.cards);
  }

  const result = groups.map((group) => ({
    _id: group._id,
    name: group.name,
    members: group.members.map((m) => ({
      _id: m._id,
      name: m.name,
      username: m.username,
      cards: cardMap.get(`${m._id.toString()}_${group._id.toString()}`) ?? [],
    })),
  }));

  res.json({ groups: result });
});

export default router;
