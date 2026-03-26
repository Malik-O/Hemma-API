import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { adminOnly } from '../middleware/adminMiddleware';
import {
  getDashboardStats,
  listUsers,
  listAllTemplates,
  adminDeleteTemplate,
  listAllGroups,
  adminDeleteGroup,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.get('/users', listUsers);

// Templates
router.get('/templates', listAllTemplates);
router.delete('/templates/:id', adminDeleteTemplate);

// Groups
router.get('/groups', listAllGroups);
router.delete('/groups/:id', adminDeleteGroup);

export default router;
