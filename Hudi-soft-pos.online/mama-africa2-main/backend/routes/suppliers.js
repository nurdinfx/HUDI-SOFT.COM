import express from 'express';
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplierController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createSupplier);
router.get('/', auth, getSuppliers);
router.put('/:id', auth, updateSupplier);
router.delete('/:id', auth, deleteSupplier);

export default router;