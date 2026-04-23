import { Router, Response } from 'express';
import { StrategyCard, Prediction, Tournament, Group, Category } from '../models/index';
import Notification from '../models/Notification';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';
import { notifyUsers } from '../socket';

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
  if (!(tournament as any).cardsEnabled) {
    res.status(403).json({ message: 'Strategy cards have been disabled for this tournament' });
    return null;
  }

  const strategyCard = await StrategyCard.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
  if (!strategyCard) { res.status(404).json({ message: 'Cards not found' }); return null; }

  const prediction = await Prediction.findOne({ user: req.user!.id, group: groupId, tournament: tournamentId });
  if (!prediction) { res.status(404).json({ message: 'No prediction found' }); return null; }

  return { tournament, strategyCard, prediction };
};

// Notify all other group members about a card use
const notifyGroupMembers = async (
  userId: string,
  groupId: string,
  message: string,
) => {
  try {
    const group = await Group.findById(groupId).populate<{ members: { _id: any; toString(): string }[] }>('members', '_id');
    if (!group) return;
    const otherMemberIds = group.members
      .map((m) => m._id.toString())
      .filter((id) => id !== userId);
    if (otherMemberIds.length === 0) return;

    // Create notification records
    const notifications = otherMemberIds.map((uid) => ({
      user: uid,
      group: groupId,
      message,
      type: 'strategy_card' as const,
      read: false,
    }));
    await Notification.insertMany(notifications);

    // Emit via socket
    notifyUsers(otherMemberIds, 'notification', { message, type: 'strategy_card' });
  } catch {
    // Non-critical — don't fail the request
  }
};

router.post('/swap', async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await validateCardUse(req, res);
  if (!data) return;
  const { strategyCard, prediction } = data;

  const availableCard = strategyCard!.cards.find((c) => !c.used);
  if (!availableCard) { res.status(400).json({ message: 'No cards remaining' }); return; }

  const { groupId, tournamentId, categoryId, oldSelection, newSelection } = req.body as {
    groupId: string; tournamentId: string;
    categoryId: string; oldSelection: string; newSelection: string;
  };

  const pick = prediction!.picks.find((p) => p.category.toString() === categoryId);
  if (!pick) { res.status(404).json({ message: 'Category not found in your predictions' }); return; }

  const oldIdx = pick.selections.indexOf(oldSelection);
  if (oldIdx === -1) { res.status(400).json({ message: 'Player not found in your selections' }); return; }

  // Check if newSelection is already in picks (rank swap)
  const newIdx = pick.selections.indexOf(newSelection);
  if (newIdx !== -1) {
    // Swap the two positions
    pick.selections[oldIdx] = newSelection;
    pick.selections[newIdx] = oldSelection;
  } else {
    // Replace oldSelection with newSelection
    pick.selections[oldIdx] = newSelection;
  }

  await prediction!.save();

  availableCard.type = 'swap';
  availableCard.used = true;
  availableCard.usedAt = new Date();
  availableCard.details = { categoryId, oldSelection, newSelection };
  await strategyCard!.save();

  // Notify other group members
  const userName = (req.user as any)?.name || 'A member';
  const action = newIdx !== -1
    ? `swapped the order of picks in their prediction`
    : `replaced ${oldSelection} with ${newSelection} in their prediction`;
  await notifyGroupMembers(req.user!.id, groupId, `${userName} used a Swap card — ${action}.`);

  res.json({ message: 'Swap applied', prediction, cards: strategyCard });
});

router.post('/joker', async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await validateCardUse(req, res);
  if (!data) return;
  const { strategyCard } = data;

  const availableCard = strategyCard!.cards.find((c) => !c.used);
  if (!availableCard) { res.status(400).json({ message: 'No cards remaining' }); return; }

  const { groupId, tournamentId, categoryId, player, predictedPosition } = req.body as {
    groupId: string; tournamentId: string;
    categoryId: string; player: string; predictedPosition: number;
  };

  const category = await Category.findById(categoryId);
  if (!category) { res.status(404).json({ message: 'Category not found' }); return; }

  const maxPosition = category.type === 'team_position' ? 4 : 5;
  if (!predictedPosition || predictedPosition < 1 || predictedPosition > maxPosition) {
    res.status(400).json({ message: `Predicted position must be between 1 and ${maxPosition} for this category` });
    return;
  }

  availableCard.type = 'joker';
  availableCard.used = true;
  availableCard.usedAt = new Date();
  availableCard.details = { categoryId, player, predictedPosition };
  await strategyCard!.save();

  // Notify other group members
  const userName = (req.user as any)?.name || 'A member';
  await notifyGroupMembers(req.user!.id, groupId, `${userName} played a Joker card on ${player} (position ${predictedPosition}).`);

  res.json({ message: 'Joker placed', cards: strategyCard });
});

export default router;
