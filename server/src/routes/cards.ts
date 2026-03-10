import { Router, Response } from 'express';
import { StrategyCard, Prediction, Tournament, Group } from '../models/index';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect);

router.get('/:groupId/:tournamentId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, tournamentId } = req.params as { groupId: string; tournamentId: string };
  const cards = await StrategyCard.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
  if (!cards) { res.status(404).json({ message: 'No cards found' }); return; }
  res.json({ cards });
});

const validateCardUse = async (req: AuthRequest, res: Response): Promise<{
  tournament: InstanceType<typeof Tournament> | null;
  strategyCard: InstanceType<typeof StrategyCard> | null;
  prediction: InstanceType<typeof Prediction> | null;
} | null> => {
  const { groupId, tournamentId } = req.body as { groupId: string; tournamentId: string };

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament || tournament.status === 'upcoming') {
    res.status(400).json({ message: 'Cards can only be used after the tournament starts' });
    return null;
  }
  if (tournament.status === 'completed') {
    res.status(400).json({ message: 'Tournament is over — cards can no longer be used' });
    return null;
  }

  const strategyCard = await StrategyCard.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
  if (!strategyCard) { res.status(404).json({ message: 'Cards not found' }); return null; }

  const prediction = await Prediction.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
  if (!prediction) { res.status(404).json({ message: 'No prediction found' }); return null; }

  return { tournament, strategyCard, prediction };
};

router.post('/swap', async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await validateCardUse(req, res);
  if (!data) return;
  const { strategyCard, prediction } = data;

  const availableCard = strategyCard!.cards.find((c) => !c.used);
  if (!availableCard) { res.status(400).json({ message: 'No cards remaining' }); return; }

  const { categoryId, oldSelection, newSelection } = req.body as { groupId: string; tournamentId: string; categoryId: string; oldSelection: string; newSelection: string };

  const pick = prediction!.picks.find((p) => p.category.toString() === categoryId);
  if (!pick) { res.status(404).json({ message: 'Category not found in your predictions' }); return; }

  const idx = pick.selections.indexOf(oldSelection);
  if (idx === -1) { res.status(400).json({ message: 'Player not found in your selections' }); return; }

  pick.selections[idx] = newSelection;
  await prediction!.save();

  availableCard.type = 'swap';
  availableCard.used = true;
  availableCard.usedAt = new Date();
  availableCard.details = { categoryId, oldSelection, newSelection };
  await strategyCard!.save();

  res.json({ message: 'Swap applied', prediction, cards: strategyCard });
});

router.post('/joker', async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await validateCardUse(req, res);
  if (!data) return;
  const { strategyCard } = data;

  const availableCard = strategyCard!.cards.find((c) => !c.used);
  if (!availableCard) { res.status(400).json({ message: 'No cards remaining' }); return; }

  const { categoryId, player, predictedPosition } = req.body as { groupId: string; tournamentId: string; categoryId: string; player: string; predictedPosition: number };

  availableCard.type = 'joker';
  availableCard.used = true;
  availableCard.usedAt = new Date();
  availableCard.details = { categoryId, player, predictedPosition };
  await strategyCard!.save();

  res.json({ message: 'Joker placed', cards: strategyCard });
});

export default router;
