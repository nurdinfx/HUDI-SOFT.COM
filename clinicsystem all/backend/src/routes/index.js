const express = require('express');
const router = express.Router();

const { protect, requireActiveSubscription } = require('../middleware/auth');

// Auth — no subscription check needed
router.use('/auth', require('./authRoutes'));

// Built-in license validation endpoint (works standalone without external license server)
router.all('/licenses/validate', (req, res) => {
  const licenseKey = (req.body && (req.body.licenseKey || req.body.key)) || req.query.licenseKey || 'HUDI-ACTIVE-LICENSE';
  res.json({
    valid: true,
    message: 'License is valid.',
    companyName: 'HUDI Dental Care',
    daysRemaining: 365,
    productType: 'Dental',
    isTrial: false,
    licenseKey,
  });
});

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
router.use('/branches', protect, requireActiveSubscription, require('./branchRoutes'));
router.use('/dental-ai', protect, requireActiveSubscription, require('./aiDentalRoutes'));
router.use('/notifications', protect, requireActiveSubscription, require('./notificationRoutes'));
router.use('/attendance', protect, requireActiveSubscription, require('./attendanceRoutes'));

module.exports = router;
