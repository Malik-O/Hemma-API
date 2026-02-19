
import mongoose, { Schema, Document } from 'mongoose';

// 1. Define the Habit Item Schema (The tasks inside a category)
export interface IHabitItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
}

const HabitItemSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['boolean', 'number'], required: true }
}, { _id: false }); // We use the client-provided 'id'

// 2. Define the Habit Category Schema (The groups like "Fajr", "Dhuhr")
export interface IHabitCategory extends Document {
  userUid?: string; // Optional: if we want to store habits per user in this collection
  id: string;       // Client-side ID (e.g., 'fajr')
  name: string;
  icon: string;
  items: IHabitItem[];
}

const HabitCategorySchema = new Schema({
  userUid: { type: String, index: true }, // To link to a user if stored separately
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  items: [HabitItemSchema]
}, { timestamps: true });

export default mongoose.model<IHabitCategory>('HabitCategory', HabitCategorySchema);
