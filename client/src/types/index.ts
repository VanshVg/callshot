export interface User {
  id: string;
  _id?:string;
  name: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Tournament {
  _id: string;
  name: string;
  sport: string;
  type: string;
  season: string;
  totalMatches: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'live' | 'completed';
  teams?: string[];
  squads?: Record<string, string[]>;
  cardsEnabled?: boolean;
}

export type Sport = 'cricket';

export interface Category {
  _id: string;
  sport: Sport;
  name: string;
  type: 'player_stat' | 'team_position' | 'single_player';
  selectionCount: number;
  scoringType: 'positional' | 'exact_match';
  description: string;
  order: number;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  createdBy: { _id: string; name: string; username: string };
  inviteCode: string;
  members: { _id: string; name: string; username: string }[];
  tournament: Tournament;
  status: 'draft' | 'active' | 'completed';
  visibility: 'public' | 'private';
  maxMembers: number;
  enabledCategories: Category[];
  enableMatchPredictions: boolean;
}

export interface Pick {
  category: Category;
  selections: string[];
}

export interface Prediction {
  _id: string;
  user: string;
  group: string;
  tournament: string;
  picks: Pick[];
  submittedAt: string;
  locked: boolean;
}

// Prediction with populated user — returned by the "all members" endpoint
export interface GroupPrediction {
  _id: string;
  user: { _id: string; name: string; username: string };
  picks: { category: { _id: string; name: string; type: string }; selections: string[] }[];
  submittedAt: string;
}

export interface Card {
  type: 'swap' | 'joker';
  used: boolean;
  usedAt: string | null;
  details: Record<string, unknown> | null;
}

export interface StrategyCards {
  _id: string;
  cards: Card[];
}

export interface Notification {
  _id: string;
  group: { _id: string; name: string };
  match?: string;
  message: string;
  type: 'categories_updated' | 'match_result';
  read: boolean;
  createdAt: string;
}

export interface MatchResult {
  winner: string | null;
  topBatter: string[] | null;
  topBowler: string[] | null;
  playerOfMatch: string[] | null;
  powerplayScoreA: number | null;
  powerplayScoreB: number | null;
}

export interface Match {
  _id: string;
  tournament: string;
  matchNumber: number;
  teamA: string;
  teamB: string;
  venue: string;
  scheduledAt: string;
  status: 'upcoming' | 'live' | 'completed';
  result: MatchResult;
}

export interface MatchPicks {
  winner: string;
  topBatter: string;
  topBowler: string;
  playerOfMatch: string;
  powerplayScoreA: number;
  powerplayScoreB: number;
}

export interface MatchPrediction {
  _id: string;
  user: string | { _id: string; name: string; username: string };
  group: string;
  match: string;
  picks: MatchPicks;
  points: number | null;
  submittedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: { id: string; name: string; username: string };
  tournamentPoints: number;
  matchPoints: number;
  totalPoints: number;
  breakdown: { categoryId: string; categoryName: string; points: number; details: string }[];
}

export interface ActualResult {
  _id: string;
  tournament: string;
  category: { _id: string; name: string; type: string; order: number };
  rankings: { position: number; name: string }[];
}
