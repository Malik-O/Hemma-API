import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-document: Habit Item ────────────────────────────────────

export interface IHabitItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
}

const HabitItemSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['boolean', 'number'], required: true },
  },
  { _id: false }
);

// ─── Main document: Habit Category ───────────────────────────────

export interface IHabitCategory extends Document {
  uid: string;
  categoryId: string;
  name: string;
  icon: string;
  items: IHabitItem[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const HabitCategorySchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    items: [HabitItemSchema],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One category per user with a given categoryId
HabitCategorySchema.index({ uid: 1, categoryId: 1 }, { unique: true });

export default mongoose.model<IHabitCategory>('HabitCategory', HabitCategorySchema);
