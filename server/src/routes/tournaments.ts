import { Router, Request, Response } from 'express';
import { Tournament, Category } from '../models/index';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const tournaments = await Tournament.find().sort({ startDate: -1 });
  res.json({ tournaments });
});

router.get('/:id', async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params['id']);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return;
  }
  // Categories are sport-level, not tournament-specific
  const categories = await Category.find({ sport: tournament.sport }).sort({ order: 1 });
  res.json({ tournament, categories });
});

// ── Player / team options for prediction picker ───────────────────────────────

router.get('/:id/options', async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params['id']);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return;
  }

  // Use only this tournament's own teams and squads stored in DB
  const teams = tournament.teams;
  const squadsMap: Record<string, string[]> =
    tournament.squads && tournament.squads.size > 0
      ? Object.fromEntries(tournament.squads)
      : {};

  const players = Array.from(new Set(Object.values(squadsMap).flat())).sort();

  res.json({ players, teams, squads: squadsMap });
});

export default router;
