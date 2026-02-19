
import { Request, Response } from 'express';
import SyncData from '../models/SyncData';

// @desc    Upload sync data
// @route   POST /api/sync/upload
// @access  Private
export const uploadSyncData = async (req: Request, res: Response): Promise<void> => {
  const { trackerState, customHabits, currentDay, theme } = req.body;

  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const existing = await SyncData.findOne({ uid: req.user.uid });

    if (existing) {
      existing.trackerState = trackerState;
      existing.customHabits = customHabits;
      existing.currentDay = currentDay;
      existing.theme = theme;
      existing.lastSynced = new Date();
      await existing.save();
      res.json(existing);
    } else {
      const syncData = await SyncData.create({
        uid: req.user.uid,
        trackerState,
        customHabits,
        currentDay,
        theme,
      });
      res.status(201).json(syncData);
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Download sync data
// @route   GET /api/sync/download
// @access  Private
export const downloadSyncData = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const syncData = await SyncData.findOne({ uid: req.user.uid });

    if (syncData) {
      res.json(syncData);
    } else {
      // Return default/empty state if no data found
      res.json({
        trackerState: {},
        customHabits: [],
        currentDay: 0,
        theme: 'dark',
        lastSynced: new Date(),
      });
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
