const express = require('express');
const router = express.Router();
const { getStats, getRecentAppointments, getMonthlyChart, getActivityTimeline } = require('../controllers/dashboardController');

router.get('/stats', getStats);
router.get('/recent-appointments', getRecentAppointments);
router.get('/monthly-chart', getMonthlyChart);
router.get('/activity-timeline', getActivityTimeline);

module.exports = router;
