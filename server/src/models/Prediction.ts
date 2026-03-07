import mongoose, { Document, Schema, Types } from 'mongoose';

interface IPick {
  category: Types.ObjectId;
  selections: string[];
}

export interface IPrediction extends Document {
  user: Types.ObjectId;
  group: Types.ObjectId;
  tournament: Types.ObjectId;
  picks: IPick[];
  submittedAt: Date;
  locked: boolean;
}

const PickSchema = new Schema<IPick>(
  {
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    selections: [{ type: String, required: true }],
  },
  { _id: false }
);

const PredictionSchema = new Schema<IPrediction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    picks: [PickSchema],
    submittedAt: { type: Date, default: Date.now },
    locked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PredictionSchema.index({ user: 1, group: 1, tournament: 1 }, { unique: true });

export default mongoose.model<IPrediction>('Prediction', PredictionSchema);
