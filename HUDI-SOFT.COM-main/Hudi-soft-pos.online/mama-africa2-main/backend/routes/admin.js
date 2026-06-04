import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { clearTransactionalData } from '../controllers/adminController.js';

const router = express.Router();

// Protected route to clear all transactional data
// Requires authentication and 'admin' role
// Requires POST body: { "confirm": "CLEAR_ALL_DATA" }
router.post('/clear-data', auth, authorize('admin'), clearTransactionalData);

export default router;
