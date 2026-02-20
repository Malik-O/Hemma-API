import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createGroup,
  getMyGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  updateGroup,
  updateGroupHabits,
  getGroupLeaderboard,
  getMemberProgress,
} from '../controllers/groupController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Group CRUD
router.post('/', createGroup);
router.get('/', getMyGroups);
router.post('/join', joinGroup);

// Single group operations
router.get('/:groupId', getGroup);
router.patch('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);

// Group habits management (admin only)
router.put('/:groupId/habits', updateGroupHabits);

// Group leaderboard
router.get('/:groupId/leaderboard', getGroupLeaderboard);

// Admin: member detail progress
router.get('/:groupId/members/:memberUid/progress', getMemberProgress);

export default router;
