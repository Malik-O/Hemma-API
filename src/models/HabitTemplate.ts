import mongoose, { Schema, Document } from 'mongoose';
import type { HabitRepeat } from './HabitCategory';

// ─── Sub-document: Template Habit Item ───────────────────────────

export interface ITemplateHabitItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
  goal?: number;
  repeat?: HabitRepeat;
  repeatDays?: number[];
  repeatMonthDay?: number;
  repeatMonthHijri?: boolean;
  repeatYearlyDate?: string;
  repeatYearlyHijri?: boolean;
  repeatEndDate?: string;
}

const TemplateHabitItemSchema = new Schema(
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

// ─── Sub-document: Template Category ─────────────────────────────

export interface ITemplateCategory {
  categoryId: string;
  name: string;
  icon: string;
  items: ITemplateHabitItem[];
}

const TemplateCategorySchema = new Schema(
  {
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    items: [TemplateHabitItemSchema],
  },
  { _id: false }
);

// ─── Main document: Habit Template ───────────────────────────────

export interface IHabitTemplate extends Document {
  name: string;
  description: string;
  authorUid: string;
  authorName: string;
  categories: ITemplateCategory[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const HabitTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    authorUid: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    categories: [TemplateCategorySchema],
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for searching templates
HabitTemplateSchema.index({ name: 'text', description: 'text' });

export default mongoose.model<IHabitTemplate>('HabitTemplate', HabitTemplateSchema);
