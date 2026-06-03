const express = require('express');
const router = express.Router();
const { createOrder } = require('../controllers/orderController');
const upload = require('../utils/upload');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', upload.single('screenshot'), createOrder);

module.exports = router;
