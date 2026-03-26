import express from 'express';
import {
  listTemplates,
  createTemplate,
  useTemplate,
  deleteTemplate,
} from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public
router.get('/', listTemplates);

// Authenticated
router.post('/', protect, createTemplate);
router.post('/:id/use', protect, useTemplate);
router.delete('/:id', protect, deleteTemplate);

export default router;
