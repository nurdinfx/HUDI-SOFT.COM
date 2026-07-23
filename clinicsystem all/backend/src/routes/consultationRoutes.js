const express = require('express');
const router = express.Router();
const { getConsultations, getConsultation, createConsultation, updateConsultation, signConsultation } = require('../controllers/consultationController');
const { authorize } = require('../middleware/auth');

router.get('/', getConsultations);
router.post('/', authorize('doctor','clinic_manager','super_admin'), createConsultation);
router.get('/:id', getConsultation);
router.put('/:id', authorize('doctor','clinic_manager','super_admin'), updateConsultation);
router.post('/:id/sign', authorize('doctor'), signConsultation);

module.exports = router;
