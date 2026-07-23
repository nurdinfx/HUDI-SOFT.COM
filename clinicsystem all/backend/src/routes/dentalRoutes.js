const express = require('express');
const router = express.Router();
const { getDentalRecords, getDentalRecordById, createDentalRecord, updateDentalRecord } = require('../controllers/dentalController');

router.get('/', getDentalRecords);
router.get('/:id', getDentalRecordById);
router.post('/', createDentalRecord);
router.put('/:id', updateDentalRecord);

module.exports = router;
