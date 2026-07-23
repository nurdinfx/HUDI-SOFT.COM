const express = require('express');
const router = express.Router();
const { getClinic, updateClinic, getSubscription, getStaff, createStaff, updateStaff, deleteStaff } = require('../controllers/clinicController');
const { authorize } = require('../middleware/auth');

router.get('/', getClinic);
router.put('/', authorize('clinic_manager','super_admin'), updateClinic);
router.get('/subscription', getSubscription);
router.get('/staff', authorize('clinic_manager','super_admin'), getStaff);
router.post('/staff', authorize('clinic_manager','super_admin'), createStaff);
router.put('/staff/:id', authorize('clinic_manager','super_admin'), updateStaff);
router.delete('/staff/:id', authorize('clinic_manager','super_admin'), deleteStaff);

module.exports = router;
