
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import generateToken from '../utils/generateToken';

interface GooglePayload {
  email?: string;
  name?: string;
  picture?: string;
}

// Helper to decode Google token (simplified as per legacy)
const decodeGoogleToken = (token: string): GooglePayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    return payload;
  } catch (e) {
    return null;
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash || ''))) {
      res.json({
        _id: user._id,
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL || '',
        provider: user.provider,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      uid: crypto.randomUUID(), 
      displayName: name,
      email,
      passwordHash,
      provider: 'local',
      theme: 'dark', 
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: '',
        provider: 'local',
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Auth with Google
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;

  try {
    const payload = decodeGoogleToken(credential);

    if (!payload?.email) {
      res.status(401);
      throw new Error('Invalid Google credential');
    }

    let user = await User.findOne({ email: payload.email });
    let isNewUser = false;

    if (user) {
      // Update profile info
      user.displayName = payload.name || user.displayName;
      user.photoURL = payload.picture || user.photoURL;
      await user.save();
    } else {
      isNewUser = true;
      user = await User.create({
        uid: uuidv4(),
        email: payload.email,
        displayName: payload.name || payload.email.split('@')[0],
        photoURL: payload.picture || '',
        passwordHash: '', // No password for Google auth users
        provider: 'google',
      });
    }

    res.json({
      _id: user._id,
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL || payload.picture || '',
      provider: 'google',
      isNewUser,
      token: generateToken(user._id.toString()),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (user) {
      res.json({
        _id: user._id,
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL || '',
        provider: user.provider,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};
