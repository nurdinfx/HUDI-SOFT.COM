const { query } = require('../db/pool');

const pad = (n) => String(n).padStart(4, '0');

const nextNumber = async (table, clinicId, prefix) => {
  const { rows } = await query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE clinic_id = $1`, [clinicId]);
  return `${prefix}-${pad(parseInt(rows[0].cnt) + 1)}`;
};

const nextPatientNumber    = (cid) => nextNumber('patients', cid, 'P');
const nextAppointmentNumber = (cid) => nextNumber('appointments', cid, 'APT');
const nextRecordNumber     = (cid) => nextNumber('consultation_notes', cid, 'MR');
const nextInvoiceNumber    = (cid) => nextNumber('invoices', cid, 'INV');
const nextLabNumber        = (cid) => nextNumber('lab_requests', cid, 'LAB');
const nextSaleNumber       = (cid) => nextNumber('pharmacy_sales', cid, 'SAL');

module.exports = {
  nextPatientNumber,
  nextAppointmentNumber,
  nextRecordNumber,
  nextInvoiceNumber,
  nextLabNumber,
  nextSaleNumber,
};
