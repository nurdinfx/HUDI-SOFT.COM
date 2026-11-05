const express = require('express');
const router = express.Router();
const {
  // Treatments
  getTreatments,
  createTreatment,
  updateTreatment,
  // Charts / Odontogram
  getPatientCharts,
  getLatestPatientChart,
  savePatientChart,
  // Plans
  getTreatmentPlans,
  getTreatmentPlanById,
  createTreatmentPlan,
  updateTreatmentPlan,
  updatePlanItemStatus,
  // Lab
  getLabOrders,
  createLabOrder,
  updateLabOrder,
  // Imaging
  getDentalImages,
  createDentalImage,
  // Legacy
  getDentalRecords,
  getDentalRecordById,
  createDentalRecord,
  updateDentalRecord
} = require('../controllers/dentalController');

// ── Treatment Catalog ────────────────────────────────────────────────────────
router.get('/treatments', getTreatments);
router.post('/treatments', createTreatment);
router.put('/treatments/:id', updateTreatment);

// ── Odontogram / Charts ───────────────────────────────────────────────────────
router.get('/charts', getPatientCharts);
router.get('/charts/latest', getLatestPatientChart);
router.post('/charts', savePatientChart);

// ── Treatment Plans ──────────────────────────────────────────────────────────
router.get('/plans', getTreatmentPlans);
router.get('/plans/:id', getTreatmentPlanById);
router.post('/plans', createTreatmentPlan);
router.put('/plans/:id', updateTreatmentPlan);
router.patch('/plans/items/:itemId/status', updatePlanItemStatus);

// ── Dental Lab Orders ────────────────────────────────────────────────────────
router.get('/lab-orders', getLabOrders);
router.post('/lab-orders', createLabOrder);
router.put('/lab-orders/:id', updateLabOrder);

// ── Dental Imaging ───────────────────────────────────────────────────────────
router.get('/images', getDentalImages);
router.post('/images', createDentalImage);

// ── Legacy Compatibility ─────────────────────────────────────────────────────
router.get('/', getDentalRecords);
router.get('/:id', getDentalRecordById);
router.post('/', createDentalRecord);
router.put('/:id', updateDentalRecord);

module.exports = router;
