import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { ActualResult, Tournament } from '../models/index';
import { protect, adminOnly } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect, adminOnly);

router.put('/tournaments/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  const tournament = await Tournament.findByIdAndUpdate(req.params['id'], { status }, { new: true });
  if (!tournament) { res.status(404).json({ message: 'Tournament not found' }); return; }
  res.json({ tournament });
});

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

export default router;
