const express = require('express');
const router = express.Router();
const { getAttendance, getMyAttendanceToday, clockIn, clockOut, logManualAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAttendance);
router.get('/me', getMyAttendanceToday);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.post('/manual', logManualAttendance);

module.exports = router;
