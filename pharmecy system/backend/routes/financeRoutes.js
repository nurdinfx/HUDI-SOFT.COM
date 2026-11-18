const express = require('express');
const { getFinancialSummary } = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, authorize('Super Admin', 'Owner', 'Accountant'), getFinancialSummary);

module.exports = router;
