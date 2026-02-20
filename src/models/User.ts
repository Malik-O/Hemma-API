
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  passwordHash?: string;
  provider: 'google' | 'local';
  showOnLeaderboard: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    photoURL: { type: String },
    passwordHash: { type: String },
    provider: { type: String, enum: ['google', 'local'], required: true },
    showOnLeaderboard: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
