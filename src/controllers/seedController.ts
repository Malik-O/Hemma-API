import { Request, Response } from 'express';
import { runSeed } from '../scripts/seed';

// @desc    Run database seed
// @route   GET /api/seed
// @access  Public (in dev) / Private (in prod)
export const seedDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    // Optionally add some environment check here:
    // if (process.env.NODE_ENV === 'production') {
    //   res.status(403).json({ message: 'Forbidden' });
    //   return;
    // }

    await runSeed(false);
    res.status(200).json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Server over during seeding' });
  }
};
