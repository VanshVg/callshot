import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'admin';
  };
}

export type UserRole = 'user' | 'admin';
export type TournamentStatus = 'upcoming' | 'live' | 'completed';
export type GroupStatus = 'draft' | 'active' | 'completed';
export type CardType = 'swap' | 'joker';
export type CategoryType = 'player_stat' | 'team_position' | 'single_player';
export type ScoringType = 'positional' | 'exact_match';

export interface JwtPayload {
  id: string;
  role: UserRole;
}
