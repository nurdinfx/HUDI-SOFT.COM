const express = require('express');
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getCategories)
  .post(protect, authorize('Super Admin', 'Owner', 'Branch Manager'), createCategory);

module.exports = router;
