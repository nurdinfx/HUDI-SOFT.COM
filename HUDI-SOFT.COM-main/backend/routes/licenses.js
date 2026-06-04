const express = require('express');
const router = express.Router();
const { validateLicense, getMyLicenses } = require('../controllers/licenseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/validate', validateLicense);
router.get('/validate', validateLicense);
router.get('/my', protect, getMyLicenses);

module.exports = router;
