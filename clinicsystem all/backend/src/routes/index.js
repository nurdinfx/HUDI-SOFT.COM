const express = require('express');
const router = express.Router();

const { protect, requireActiveSubscription } = require('../middleware/auth');

// Auth — no subscription check needed
router.use('/auth', require('./authRoutes'));

// All routes below require valid JWT + active subscription
router.use('/dashboard', protect, requireActiveSubscription, require('./dashboardRoutes'));
router.use('/patients', protect, requireActiveSubscription, require('./patientRoutes'));
router.use('/appointments', protect, requireActiveSubscription, require('./appointmentRoutes'));
router.use('/consultations', protect, requireActiveSubscription, require('./consultationRoutes'));
router.use('/lab', protect, requireActiveSubscription, require('./labRoutes'));
router.use('/pharmacy', protect, requireActiveSubscription, require('./pharmacyRoutes'));
router.use('/invoices', protect, requireActiveSubscription, require('./invoiceRoutes'));
router.use('/dental', protect, requireActiveSubscription, require('./dentalRoutes'));
router.use('/clinic', protect, require('./clinicRoutes'));
router.use('/notifications', protect, requireActiveSubscription, require('./notificationRoutes'));
router.use('/attendance', protect, requireActiveSubscription, require('./attendanceRoutes'));

module.exports = router;
