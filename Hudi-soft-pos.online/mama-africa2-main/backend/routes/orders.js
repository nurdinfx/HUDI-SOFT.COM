
// backend/routes/orders.js
import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  createOrder,
  getOrders,
  getOrder,
  getKitchenOrders,
  updateOrderStatus,
  processPayment,
  getOrderStats,

  updateOrder,
  deleteOrder
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/', auth, authorize('admin', 'manager', 'cashier', 'waiter'), createOrder);
router.put('/:id', auth, authorize('admin', 'manager', 'cashier', 'waiter'), updateOrder);
router.get('/', auth, authorize('admin', 'manager', 'cashier', 'waiter'), getOrders);
router.get('/kitchen', auth, authorize('admin', 'manager', 'chef', 'kitchen'), getKitchenOrders);
router.get('/stats', auth, authorize('admin', 'manager'), getOrderStats);
router.get('/:id', auth, authorize('admin', 'manager', 'cashier', 'waiter'), getOrder);
router.put('/:id/status', auth, authorize('admin', 'chef', 'manager', 'kitchen'), updateOrderStatus);
router.post('/:id/payment', auth, authorize('admin', 'manager', 'cashier'), processPayment);
router.delete('/:id', auth, authorize('admin', 'manager'), deleteOrder);

export default router;
