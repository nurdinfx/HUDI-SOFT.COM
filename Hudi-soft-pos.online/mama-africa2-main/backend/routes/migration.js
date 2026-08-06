import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  parseAndPreview,
  executeMigration,
  getLogs,
  rollbackBackup
} from '../controllers/migrationController.js';

const router = express.Router();

router.use(auth);
router.use(authorize('admin', 'manager'));

router.get('/dashboard', getDashboardStats);
router.post('/preview', parseAndPreview);
router.post('/execute', executeMigration);
router.get('/logs', getLogs);
router.post('/rollback/:backupId', rollbackBackup);

export default router;
