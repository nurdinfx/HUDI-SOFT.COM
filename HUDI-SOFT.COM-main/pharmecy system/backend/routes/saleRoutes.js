const express = require('express');
const { createSale, getSales } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createSale)
  .get(protect, getSales);

module.exports = router;
