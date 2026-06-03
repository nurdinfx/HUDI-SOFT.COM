const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getOrders,
    verifyOrder,
    getLicenses,
    updateLicense
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getDashboardStats);
router.get('/orders', protect, admin, getOrders);
router.put('/orders/:id/verify', protect, admin, verifyOrder);
router.get('/licenses', protect, admin, getLicenses);
router.put('/licenses/:id', protect, admin, updateLicense);

module.exports = router;
