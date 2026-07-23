const express = require('express');
const router = express.Router();
const { getLabRequests, createLabRequest, updateLabStatus, addLabResults, getLabResults } = require('../controllers/labController');
const { authorize } = require('../middleware/auth');

router.get('/requests', getLabRequests);
router.post('/requests', authorize('doctor','clinic_manager','super_admin'), createLabRequest);
router.put('/requests/:id/status', updateLabStatus);
router.post('/requests/:id/results', authorize('lab_staff','clinic_manager','super_admin'), addLabResults);
router.get('/requests/:id/results', getLabResults);

module.exports = router;
