import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  inviteCode: string;
  members: Types.ObjectId[];
  tournament: Types.ObjectId;
  status: 'draft' | 'active' | 'completed';
  visibility: 'public' | 'private';
  maxMembers: number;
  enabledCategories: Types.ObjectId[];
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, required: true, unique: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    maxMembers: { type: Number, default: 20, min: 2, max: 100 },
    enabledCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
