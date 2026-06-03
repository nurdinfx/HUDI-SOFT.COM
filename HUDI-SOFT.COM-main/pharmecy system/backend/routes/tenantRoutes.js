const express = require('express');
const router = express.Router();
const { getTenantSettings, updateTenantSettings } = require('../controllers/tenantController');
const { protect } = require('../middleware/authMiddleware');

router.route('/settings')
  .get(protect, getTenantSettings)
  .put(protect, updateTenantSettings);

module.exports = router;
