
import express from 'express';
import { uploadSyncData, downloadSyncData, resetSyncData } from '../controllers/syncController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/upload', protect, uploadSyncData);
router.get('/download', protect, downloadSyncData);
router.delete('/reset', protect, resetSyncData);

export default router;

