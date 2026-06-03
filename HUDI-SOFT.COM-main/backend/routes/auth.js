const express = require('express');
const router = express.Router();
const { authUser, registerAdmin } = require('../controllers/authController');

router.post('/login', authUser);
// Use this once to create the super admin, then disable or secure it.
router.post('/register-admin', registerAdmin);

module.exports = router;
