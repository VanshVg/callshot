import mongoose, { Document, Schema, Types } from 'mongoose';

interface IRanking {
  position: number;
  name: string;
}

export interface IActualResult extends Document {
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  rankings: IRanking[];
  updatedAt: Date;
}

const RankingSchema = new Schema<IRanking>(
  {
    position: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const ActualResultSchema = new Schema<IActualResult>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    rankings: [RankingSchema],
  },
  { timestamps: true }
);

ActualResultSchema.index({ tournament: 1, category: 1 }, { unique: true });

export default mongoose.model<IActualResult>('ActualResult', ActualResultSchema);
