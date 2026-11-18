import express from 'express';
import {
  createPurchase,
  getPurchases,
  getDailyPurchases,
  updatePurchase,
  deletePurchase
} from '../controllers/purchaseController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createPurchase);
router.get('/', auth, getPurchases);
router.get('/daily', auth, getDailyPurchases);
router.put('/:id', auth, updatePurchase);
router.delete('/:id', auth, deletePurchase);

export default router;