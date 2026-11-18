const express = require('express');
const router = express.Router();
const { getInvoices, getInvoice, createInvoice, recordPayment, getRevenueStats } = require('../controllers/invoiceController');

router.get('/stats', getRevenueStats);
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.post('/:id/pay', recordPayment);

module.exports = router;
