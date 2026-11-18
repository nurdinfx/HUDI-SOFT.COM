const express = require('express');
const router = express.Router();
const { getTodaySummary, getAppointments, getAppointment, createAppointment, updateAppointment } = require('../controllers/appointmentController');

router.get('/today', getTodaySummary);
router.get('/', getAppointments);
router.post('/', createAppointment);
router.get('/:id', getAppointment);
router.put('/:id', updateAppointment);

module.exports = router;
