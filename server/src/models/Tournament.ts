import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  sport: string;
  type: string;
  season: string;
  totalMatches: number;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'live' | 'completed';
  teams: string[];
  squads: Map<string, string[]>;
  createdAt: Date;
}

const TournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true, default: 'cricket' },
    type: { type: String, required: true },
    season: { type: String, required: true },
    totalMatches: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
    teams: { type: [String], default: [] },
    squads: { type: Map, of: [String], default: {} },
  },
  { timestamps: true }
);

export default mongoose.model<ITournament>('Tournament', TournamentSchema);
