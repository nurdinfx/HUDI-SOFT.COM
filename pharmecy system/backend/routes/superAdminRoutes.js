const express = require('express');
const router = express.Router();
const { getPlatformStats, getAllTenants, updateTenant } = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('Super Admin'));

router.get('/stats', getPlatformStats);
router.get('/tenants', getAllTenants);
router.put('/tenants/:id', updateTenant);

module.exports = router;
