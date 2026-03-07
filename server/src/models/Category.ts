import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  tournament: Types.ObjectId;
  name: string;
  type: 'player_stat' | 'team_position' | 'single_player';
  selectionCount: number;
  scoringType: 'positional' | 'exact_match';
  description: string;
  order: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['player_stat', 'team_position', 'single_player'], required: true },
    selectionCount: { type: Number, required: true },
    scoringType: { type: String, enum: ['positional', 'exact_match'], required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>('Category', CategorySchema);
