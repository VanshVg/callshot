import { Types } from 'mongoose';
import { Prediction, ActualResult, StrategyCard, Category } from '../models/index';

const POSITION_POINTS: Record<number, number> = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };
const JOKER_BONUS = 30;
const UNUSED_CARD_POINTS = 4;
const PLAYER_OF_TOURNAMENT_POINTS = 20;

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  points: number;
  details: string;
}

export interface UserScore {
  userId: string;
  totalPoints: number;
  breakdown: CategoryBreakdown[];
}

export const calculateScore = async (
  userId: string | Types.ObjectId,
  groupId: string | Types.ObjectId,
  tournamentId: string | Types.ObjectId
): Promise<UserScore> => {
  const prediction = await Prediction.findOne({ user: userId, group: groupId, tournament: tournamentId });
  if (!prediction) return { userId: userId.toString(), totalPoints: 0, breakdown: [] };

  const actualResults = await ActualResult.find({ tournament: tournamentId });
  const strategyCardDoc = await StrategyCard.findOne({ user: userId, group: groupId, tournament: tournamentId });

  const breakdown: CategoryBreakdown[] = [];
  let total = 0;

  for (const pick of prediction.picks) {
    const category = await Category.findById(pick.category);
    if (!category) continue;

    const result = actualResults.find((r) => r.category.toString() === pick.category.toString());
    if (!result) continue;

    let pts = 0;
    let details = '';

    if (category.scoringType === 'exact_match') {
      // Player of the Tournament
      const correct = pick.selections.some((sel) =>
        result.rankings.some((r) => r.name.toLowerCase() === sel.toLowerCase())
      );
      if (correct) {
        pts = PLAYER_OF_TOURNAMENT_POINTS;
        details = 'Correct Player of Tournament pick';
      }
    } else {
      // Positional scoring
      for (const sel of pick.selections) {
        const match = result.rankings.find((r) => r.name.toLowerCase() === sel.toLowerCase());
        if (match && POSITION_POINTS[match.position]) {
          pts += POSITION_POINTS[match.position]!;
          details += `${sel} → P${match.position} (+${POSITION_POINTS[match.position]}pts) `;
        }
      }
    }

    // Joker bonus
    if (strategyCardDoc) {
      const joker = strategyCardDoc.cards.find(
        (c) => c.type === 'joker' && c.used && (c.details as any)?.categoryId === pick.category.toString()
      );
      if (joker) {
        const d = joker.details as any;
        const match = result.rankings.find((r) => r.name.toLowerCase() === d.player.toLowerCase());
        if (match && match.position === d.predictedPosition) {
          pts += JOKER_BONUS;
          details += `Joker CORRECT (+${JOKER_BONUS}pts)`;
        }
      }
    }

    total += pts;
    breakdown.push({ categoryId: pick.category.toString(), categoryName: category.name, points: pts, details: details.trim() });
  }

  // Unused card bonus
  if (strategyCardDoc) {
    const unusedCount = strategyCardDoc.cards.filter((c) => !c.used).length;
    if (unusedCount > 0) {
      const unusedPts = unusedCount * UNUSED_CARD_POINTS;
      total += unusedPts;
      breakdown.push({ categoryId: 'cards', categoryName: 'Unused Strategy Cards', points: unusedPts, details: `${unusedCount} unused card(s) × ${UNUSED_CARD_POINTS}pts` });
    }
  }

  return { userId: userId.toString(), totalPoints: total, breakdown };
};
