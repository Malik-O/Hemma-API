import express from 'express';
import { seedDatabase, removeSeedData } from '../controllers/seedController';

const router = express.Router();

router.get('/', seedDatabase);

// @desc    Reverse database seed
// @route   DELETE /api/seed
// @access  Public (in dev) / Private (in prod)
router.delete('/', removeSeedData);

export default router;
