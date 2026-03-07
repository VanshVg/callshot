import mongoose, { Document, Schema, Types } from 'mongoose';

interface ICard {
  type: 'swap' | 'joker';
  used: boolean;
  usedAt: Date | null;
  details: Record<string, unknown> | null;
}

export interface IStrategyCard extends Document {
  user: Types.ObjectId;
  group: Types.ObjectId;
  tournament: Types.ObjectId;
  cards: ICard[];
}

const CardSchema = new Schema<ICard>(
  {
    type: { type: String, enum: ['swap', 'joker'], required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
    details: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const StrategyCardSchema = new Schema<IStrategyCard>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    cards: [CardSchema],
  },
  { timestamps: true }
);

StrategyCardSchema.index({ user: 1, group: 1, tournament: 1 }, { unique: true });

export default mongoose.model<IStrategyCard>('StrategyCard', StrategyCardSchema);
