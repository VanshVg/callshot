import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMatchPicks {
  winner: string;
  topBatter: string;
  topBowler: string;
  playerOfMatch: string;
  powerplayScoreA: number;
  powerplayScoreB: number;
}

export interface IMatchPrediction extends Document {
  user: Types.ObjectId;
  group: Types.ObjectId;
  match: Types.ObjectId;
  picks: IMatchPicks;
  points: number | null;
  submittedAt: Date;
}

const MatchPredictionSchema = new Schema<IMatchPrediction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    picks: {
      winner: { type: String, required: true },
      topBatter: { type: String, required: true },
      topBowler: { type: String, required: true },
      playerOfMatch: { type: String, required: true },
      powerplayScoreA: { type: Number, required: true },
      powerplayScoreB: { type: Number, required: true },
    },
    points: { type: Number, default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One prediction per user per match per group
MatchPredictionSchema.index({ user: 1, match: 1, group: 1 }, { unique: true });

export default mongoose.model<IMatchPrediction>('MatchPrediction', MatchPredictionSchema);
