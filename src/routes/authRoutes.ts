
import express from 'express';
import { authUser, registerUser, getUserProfile, googleLogin, toggleLeaderboardVisibility } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);
router.patch('/leaderboard-visibility', protect, toggleLeaderboardVisibility);

export default router;
