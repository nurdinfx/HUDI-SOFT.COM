// backend/routes/qr.js
import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  getMenuByToken,
  placeQROrder,
  trackOrderBySession,
  createWaiterRequest,
  getTablesWithQR,
  generateTableQR,
  toggleTableQR,
  getWaiterRequests,
  updateWaiterRequest,
  getQRAnalytics,
} from '../controllers/qrController.js';

const router = express.Router();

// ─── PUBLIC ROUTES (no auth — customer phone) ─────────────────────────────────
router.get('/menu/:tableToken', getMenuByToken);
router.post('/orders', placeQROrder);
router.get('/track/:sessionId', trackOrderBySession);
router.post('/waiter-request', createWaiterRequest);

// ─── STAFF ROUTES ─────────────────────────────────────────────────────────────
router.get('/waiter-requests', auth, authorize('admin', 'manager', 'waiter'), getWaiterRequests);
router.patch('/waiter-requests/:id', auth, authorize('admin', 'manager', 'waiter'), updateWaiterRequest);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.get('/tables', auth, authorize('admin', 'manager'), getTablesWithQR);
router.post('/tables/:id/generate', auth, authorize('admin', 'manager'), generateTableQR);
router.patch('/tables/:id/toggle', auth, authorize('admin', 'manager'), toggleTableQR);
router.get('/analytics', auth, authorize('admin', 'manager'), getQRAnalytics);

export default router;
