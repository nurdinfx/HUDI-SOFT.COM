const express = require('express');
const router = express.Router();
const { getMedications, createMedication, updateMedication, createSale, getSales, getLowStock } = require('../controllers/pharmacyController');
const { authorize } = require('../middleware/auth');

router.get('/medications', getMedications);
router.post('/medications', authorize('pharmacist','clinic_manager','super_admin'), createMedication);
router.put('/medications/:id', authorize('pharmacist','clinic_manager','super_admin'), updateMedication);
router.get('/medications/low-stock', getLowStock);
router.get('/sales', getSales);
router.post('/sales', authorize('pharmacist','clinic_manager','super_admin'), createSale);

module.exports = router;
