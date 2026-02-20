import mongoose, { Document, Schema } from 'mongoose';

export interface IHabitEntry extends Document {
  uid: string;
  dayIndex: number;
  habitId: string;
  value: boolean | number;
  updatedAt: Date;
  createdAt: Date;
}

const HabitEntrySchema: Schema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    dayIndex: { type: Number, required: true },
    habitId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// Compound index: one entry per user + day + habit (upsert-friendly)
HabitEntrySchema.index({ uid: 1, dayIndex: 1, habitId: 1 }, { unique: true });

// Index for efficient queries by user + day
HabitEntrySchema.index({ uid: 1, dayIndex: 1 });

export default mongoose.model<IHabitEntry>('HabitEntry', HabitEntrySchema);
