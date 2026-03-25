import mongoose, { Document, Schema } from 'mongoose';

export interface IHabitEntry extends Document {
  uid: string;
  date: string;
  habitId: string;
  value: boolean | number;
  updatedAt: Date;
  createdAt: Date;
}

const HabitEntrySchema: Schema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    date: { type: String, required: true },
    habitId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// Compound index: one entry per user + date + habit (upsert-friendly)
HabitEntrySchema.index({ uid: 1, date: 1, habitId: 1 }, { unique: true });

// Index for efficient queries by user + date
HabitEntrySchema.index({ uid: 1, date: 1 });

export default mongoose.model<IHabitEntry>('HabitEntry', HabitEntrySchema);
