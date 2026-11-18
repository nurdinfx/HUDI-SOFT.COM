const express = require('express');
const { getShareholders, addShareholder } = require('../controllers/shareholderController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, authorize('Super Admin', 'Owner'), getShareholders)
  .post(protect, authorize('Super Admin', 'Owner'), addShareholder);

module.exports = router;
