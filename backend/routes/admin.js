const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getOrders,
    verifyOrder,
    getLicenses,
    updateLicense,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createLicense
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getDashboardStats);
router.get('/orders', protect, admin, getOrders);
router.put('/orders/:id/verify', protect, admin, verifyOrder);
router.get('/licenses', protect, admin, getLicenses);
router.put('/licenses/:id', protect, admin, updateLicense);
router.post('/licenses', protect, admin, createLicense);

router.get('/customers', protect, admin, getCustomers);
router.post('/customers', protect, admin, createCustomer);
router.put('/customers/:id', protect, admin, updateCustomer);
router.delete('/customers/:id', protect, admin, deleteCustomer);

module.exports = router;
