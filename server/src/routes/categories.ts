import { Router, Request, Response } from 'express';
import { Category } from '../models/index';

const router = Router();

// GET /api/categories?sport=cricket
router.get('/', async (req: Request, res: Response) => {
  const { sport } = req.query;
  if (!sport || typeof sport !== 'string') {
    res.status(400).json({ message: 'sport query param is required' });
    return;
  }
  const categories = await Category.find({ sport }).sort({ order: 1 });
  res.json({ categories });
});

export default router;
