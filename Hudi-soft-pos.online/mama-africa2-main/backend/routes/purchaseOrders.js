import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseOrderController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createPurchaseOrder);
router.get('/', auth, getPurchaseOrders);
router.put('/:id/approve', auth, approvePurchaseOrder);
router.put('/:id/reject', auth, rejectPurchaseOrder);
router.delete('/:id', auth, deletePurchaseOrder);

export default router;