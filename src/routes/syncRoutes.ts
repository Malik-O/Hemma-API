
import express from 'express';
import { uploadSyncData, downloadSyncData } from '../controllers/syncController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/upload', protect, uploadSyncData);
router.get('/download', protect, downloadSyncData);

export default router;
