// backend/routes/employees.js
import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAdvances,
  createAdvance,
  updateAdvanceStatus,
  deleteAdvance,
  getEmployeeSummary
} from '../controllers/employeeController.js';

const router = express.Router();

router.get('/', auth, authorize('admin', 'manager'), getEmployees);
router.get('/advances', auth, authorize('admin', 'manager'), getAdvances);
router.get('/summary', auth, authorize('admin', 'manager'), getEmployeeSummary);
router.get('/:id', auth, authorize('admin', 'manager'), getEmployee);
router.post('/', auth, authorize('admin', 'manager'), createEmployee);
router.post('/advances', auth, authorize('admin', 'manager'), createAdvance);
router.put('/:id', auth, authorize('admin', 'manager'), updateEmployee);
router.put('/advances/:id/status', auth, authorize('admin', 'manager'), updateAdvanceStatus);
router.delete('/advances/:id', auth, authorize('admin', 'manager'), deleteAdvance);
router.delete('/:id', auth, authorize('admin'), deleteEmployee);

export default router;
