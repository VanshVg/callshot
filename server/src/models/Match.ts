import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMatchResult {
  winner: string | null;
  topBatter: string[] | null;
  topBowler: string[] | null;
  playerOfMatch: string[] | null;
  powerplayScoreA: number | null;
  powerplayScoreB: number | null;
}

export interface IMatch extends Document {
  tournament: Types.ObjectId;
  matchNumber: number;
  teamA: string;
  teamB: string;
  venue: string;
  scheduledAt: Date;
  status: 'upcoming' | 'live' | 'completed';
  result: IMatchResult;
}

const MatchSchema = new Schema<IMatch>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    matchNumber: { type: Number, required: true },
    teamA: { type: String, required: true },
    teamB: { type: String, required: true },
    venue: { type: String, default: '' },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
    result: {
      winner: { type: String, default: null },
      topBatter: { type: [String], default: null },
      topBowler: { type: [String], default: null },
      playerOfMatch: { type: [String], default: null },
      powerplayScoreA: { type: Number, default: null },
      powerplayScoreB: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

MatchSchema.index({ tournament: 1, matchNumber: 1 });

export default mongoose.model<IMatch>('Match', MatchSchema);
