const express = require('express');
const { getBranches, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getBranches)
  .post(protect, authorize('Super Admin', 'Owner'), createBranch);

router.route('/:id')
  .put(protect, authorize('Super Admin', 'Owner'), updateBranch)
  .delete(protect, authorize('Super Admin', 'Owner'), deleteBranch);

module.exports = router;
