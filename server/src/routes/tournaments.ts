import { Router, Request, Response } from 'express';
import { Tournament, Category } from '../models/index';
import { IPL_PLAYERS, IPL_SQUADS, IPL_TEAMS } from '../constants/ipl';

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
  const categories = await Category.find({ tournament: tournament._id }).sort({ order: 1 });
  res.json({ tournament, categories });
});

// ── Player / team options for prediction picker ───────────────────────────────

router.get('/:id/options', async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params['id']);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return;
  }

  // Use DB-stored teams/squads if present, otherwise fall back to IPL constants
  const teams = tournament.teams.length > 0 ? tournament.teams : IPL_TEAMS;
  const squadsMap: Record<string, string[]> =
    tournament.squads && tournament.squads.size > 0
      ? Object.fromEntries(tournament.squads)
      : IPL_SQUADS;

  const players = Array.from(new Set(Object.values(squadsMap).flat())).sort();

  res.json({ players, teams, squads: squadsMap });
});

export default router;
