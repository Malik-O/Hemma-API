
import mongoose, { Document, Schema } from 'mongoose';

export interface ISyncData extends Document {
  uid: string;
  trackerState: Record<string, any>;
  /** Per-day last-modified timestamps: dayIndex → ISO string */
  dayUpdatedAt: Record<string, string>;
  customHabits: any[];
  customHabitsUpdatedAt: string;
  currentDay: number;
  theme: string;
  lastSynced: Date;
}

const SyncDataSchema: Schema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    trackerState: { type: Schema.Types.Mixed, default: {} },
    dayUpdatedAt: { type: Schema.Types.Mixed, default: {} },
    customHabits: { type: [Schema.Types.Mixed], default: [] },
    customHabitsUpdatedAt: { type: String, default: '' },
    currentDay: { type: Number, default: 0 },
    theme: { type: String, default: 'dark' },
    lastSynced: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ISyncData>('SyncData', SyncDataSchema);
