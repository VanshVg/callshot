import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;
  group: Types.ObjectId;
  match?: Types.ObjectId;
  message: string;
  type: 'categories_updated' | 'match_result';
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    message: { type: String, required: true },
    type: { type: String, enum: ['categories_updated', 'match_result'], required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
