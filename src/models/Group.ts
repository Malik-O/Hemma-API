import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// ─── Sub-documents ───────────────────────────────────────────────

export interface IGroupHabitItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
}

const GroupHabitItemSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['boolean', 'number'], required: true },
  },
  { _id: false }
);

export interface IGroupCategory {
  categoryId: string;
  name: string;
  icon: string;
  items: IGroupHabitItem[];
  sortOrder: number;
}

const GroupCategorySchema = new Schema(
  {
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    items: [GroupHabitItemSchema],
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Main Document ───────────────────────────────────────────────

export interface IGroup extends Document {
  name: string;
  emoji: string;
  adminUid: string;
  memberUids: string[];
  inviteCode: string;
  categories: IGroupCategory[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    emoji: { type: String, default: '👥' },
    adminUid: { type: String, required: true, index: true },
    memberUids: { type: [String], default: [], index: true },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categories: [GroupCategorySchema],
  },
  { timestamps: true }
);

/** Generate a unique, short invite code */
GroupSchema.statics.generateInviteCode = function (): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

export default mongoose.model<IGroup>('Group', GroupSchema);
