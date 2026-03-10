import { Router, Response } from 'express';
import { Group, Prediction, MatchPrediction } from '../models/index';
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

  // Tournament prediction scores for members who submitted
  const tournamentPredictions = await Prediction.find({ group: groupId, tournament: tournamentId });
  const tournamentUserIds = tournamentPredictions.map((p) => p.user.toString());

  const tournamentScores = await Promise.all(
    tournamentUserIds.map((uid) => calculateScore(uid, groupId, tournamentId))
  );
  const tournamentScoreMap: Record<string, ReturnType<typeof calculateScore> extends Promise<infer T> ? T : never> = {};
  for (const score of tournamentScores) {
    tournamentScoreMap[score.userId] = score;
  }

  // Match prediction points summed per user (only scored ones)
  const matchPredictions = await MatchPrediction.find({ group: groupId, points: { $ne: null } });
  const matchPtsMap: Record<string, number> = {};
  for (const mp of matchPredictions) {
    const uid = mp.user.toString();
    matchPtsMap[uid] = (matchPtsMap[uid] ?? 0) + (mp.points ?? 0);
  }

  // Build standings for all group members
  const standings = (group.members as any[])
    .map((member) => {
      const uid = member._id.toString();
      const ts = tournamentScoreMap[uid];
      const matchPts = matchPtsMap[uid] ?? 0;
      const tournamentPts = ts?.totalPoints ?? 0;
      return {
        user: { id: uid, name: member.name, username: member.username },
        tournamentPoints: tournamentPts,
        matchPoints: matchPts,
        totalPoints: tournamentPts + matchPts,
        breakdown: ts?.breakdown ?? [],
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, idx) => ({ rank: idx + 1, ...entry }));

  res.json({
    standings,
    totalParticipants: group.members.length,
    predictionsSubmitted: tournamentPredictions.length,
  });
});

export default router;
