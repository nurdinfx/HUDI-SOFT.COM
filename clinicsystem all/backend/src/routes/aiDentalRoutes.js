// backend/src/routes/aiDentalRoutes.js
const express = require('express');
const router = express.Router();
const { queryDentalAssistant } = require('../controllers/aiDentalAssistantController');

router.post('/query', queryDentalAssistant);

module.exports = router;

