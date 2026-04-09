import express from 'express';
import {
  listTemplates,
  createTemplate,
  useTemplate,
  applyTemplate,
  deleteTemplate,
  updateTemplate,
} from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public
router.get('/', listTemplates);

// Authenticated
router.post('/', protect, createTemplate);
router.post('/:id/use', protect, useTemplate);
router.post('/:id/apply', protect, applyTemplate);
router.put('/:id', protect, updateTemplate);
router.delete('/:id', protect, deleteTemplate);

export default router;
