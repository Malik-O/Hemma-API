import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-document: Habit Item ────────────────────────────────────

export type HabitRepeat = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface IHabitItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
  goal?: number;               // Optional goal for number-type habits
  repeat?: HabitRepeat;
  repeatDays?: number[];       // For weekly/biweekly: day-of-week (0=Sun..6=Sat)
  repeatMonthDay?: number;     // For monthly: day of month (1–31)
  repeatMonthHijri?: boolean;  // For monthly: use Hijri calendar day
  repeatYearlyDate?: string;   // For yearly: "MM-DD" format
  repeatYearlyHijri?: boolean; // For yearly: use Hijri calendar
  repeatEndDate?: string;      // End repeat date "YYYY-MM-DD"
}

const HabitItemSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['boolean', 'number'], required: true },
    goal: { type: Number, default: undefined },
    repeat: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
      default: 'daily',
    },
    repeatDays: { type: [Number], default: undefined },
    repeatMonthDay: { type: Number, default: undefined },
    repeatMonthHijri: { type: Boolean, default: undefined },
    repeatYearlyDate: { type: String, default: undefined },
    repeatYearlyHijri: { type: Boolean, default: undefined },
    repeatEndDate: { type: String, default: undefined },
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
