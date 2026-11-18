const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, activate } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/activate', activate);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
