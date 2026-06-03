const express = require('express');
const { getMedicines, createMedicine, addStock } = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getMedicines)
  .post(protect, authorize('Super Admin', 'Owner', 'Branch Manager', 'Pharmacist'), createMedicine);

router.post('/:id/stock', protect, authorize('Super Admin', 'Owner', 'Branch Manager', 'Pharmacist'), addStock);

module.exports = router;
