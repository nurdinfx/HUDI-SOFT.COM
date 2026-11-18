const express = require('express');
const router = express.Router();
const {
  getMedications,
  createMedication,
  updateMedication,
  createSale,
  getSales,
  getSaleDetails,
  getPharmacyStats,
  getLowStock
} = require('../controllers/pharmacyController');
const { authorize } = require('../middleware/auth');

router.get('/medications', getMedications);
router.post('/medications', authorize('pharmacist','clinic_manager','super_admin'), createMedication);
router.put('/medications/:id', authorize('pharmacist','clinic_manager','super_admin'), updateMedication);
router.get('/medications/low-stock', getLowStock);
router.get('/stats', getPharmacyStats);
router.get('/sales', getSales);
router.get('/sales/:id', getSaleDetails);
router.post('/sales', authorize('pharmacist','clinic_manager','super_admin','doctor','receptionist'), createSale);

module.exports = router;
