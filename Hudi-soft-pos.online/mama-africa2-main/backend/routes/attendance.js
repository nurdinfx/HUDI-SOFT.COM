import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  getAttendanceDashboard,
  getLiveMonitor,
  getAttendanceLogs,
  manualLogAdjustment,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  assignEmployeeShift,
  getStations,
  createStation,
  regenerateStationToken,
  deleteStation,
  getSettings,
  updateSettings,
  getAuditLogs,
  getPublicStation,
  identifyEmployee,
  registerOptions,
  registerVerify,
  loginOptions,
  loginVerify,
  pinVerifyFallback
} from '../controllers/attendanceController.js';

const router = express.Router();

// ─── PUBLIC SCANNED QR PAGE ROUTES ──────────────────────────────────────────
// No POS session auth required for employees checking in via mobile
router.get('/public/station/:token', getPublicStation);
router.post('/public/identify', identifyEmployee);
router.post('/public/register-options', registerOptions);
router.post('/public/register-verify', registerVerify);
router.post('/public/login-options', loginOptions);
router.post('/public/login-verify', loginVerify);
router.post('/public/pin-fallback', pinVerifyFallback);

// ─── PROTECTED ADMIN & MANAGER MANAGEMENT ROUTES ──────────────────────────────────────
router.use(auth); // Requires login
router.use(authorize('admin', 'manager')); // Requires admin or manager permissions

// Dashboard & Live Monitor
router.get('/dashboard-stats', getAttendanceDashboard);
router.get('/monitor', getLiveMonitor);

// Logs
router.get('/logs', getAttendanceLogs);
router.post('/logs/manual', manualLogAdjustment);

// Shift management
router.get('/shifts', getShifts);
router.post('/shifts', createShift);
router.put('/shifts/:id', updateShift);
router.delete('/shifts/:id', deleteShift);
router.post('/shifts/assign', assignEmployeeShift);

// QR Station creator
router.get('/stations', getStations);
router.post('/stations', createStation);
router.post('/stations/:id/regenerate', regenerateStationToken);
router.delete('/stations/:id', deleteStation);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Audit Trails
router.get('/audit-logs', getAuditLogs);

export default router;
