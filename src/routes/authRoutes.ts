
import express from 'express';
import { authUser, registerUser, getUserProfile, googleLogin, toggleLeaderboardVisibility, updateProfileName } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);
router.patch('/leaderboard-visibility', protect, toggleLeaderboardVisibility);
router.patch('/name', protect, updateProfileName);

export default router;
