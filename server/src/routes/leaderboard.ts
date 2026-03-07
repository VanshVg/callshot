import { Router, Response } from 'express';
import { Group, Prediction } from '../models/index';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';
import { calculateScore } from '../services/pointsCalculator';

const router = Router();

router.use(protect);

router.get('/:groupId/:tournamentId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, tournamentId } = req.params as { groupId: string; tournamentId: string };

  const group = await Group.findById(groupId).populate('members', 'name username');
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  const isMember = group.members.some((m: any) => m._id.toString() === req.user!.id);
  if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

  const predictions = await Prediction.find({ group: groupId, tournament: tournamentId });
  const submittedUserIds = predictions.map((p) => p.user.toString());

  const scores = await Promise.all(
    submittedUserIds.map((uid) => calculateScore(uid, groupId, tournamentId))
  );

  const standings = scores
    .map((score) => {
      const member = group.members.find((m: any) => m._id.toString() === score.userId) as any;
      return { user: member ? { id: member._id, name: member.name, username: member.username } : { id: score.userId }, ...score };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, idx) => ({ rank: idx + 1, ...entry }));

  res.json({ standings, totalParticipants: group.members.length, predictionsSubmitted: predictions.length });
});

export default router;
