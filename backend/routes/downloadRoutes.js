const express = require('express');
const router = express.Router();
const { downloadSystem, downloadDemo } = require('../controllers/downloadController');
const { protect } = require('../middleware/authMiddleware');

router.get('/demo/:productType', downloadDemo); // Public route for trials
router.get('/:productType', protect, downloadSystem);

module.exports = router;
