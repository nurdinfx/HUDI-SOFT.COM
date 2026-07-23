const { query, getClient } = require('../db/pool');
const { nextInvoiceNumber } = require('../utils/autoNumber');

/** GET /api/invoices */
const getInvoices = async (req, res) => {
  try {
    const { patientId, paymentStatus, page = 1, limit = 20 } = req.query;
    const cid = req.user.clinic_id;
    const conditions = ['i.clinic_id = $1'];
    const params = [cid];
    let idx = 2;
    if (patientId) { conditions.push(`i.patient_id = $${idx++}`); params.push(patientId); }
    if (paymentStatus) { conditions.push(`i.payment_status = $${idx++}`); params.push(paymentStatus); }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) AS total FROM invoices i ${where}`, params);
    const total = parseInt(countRes.rows[0].total);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await query(
      `SELECT i.*, p.full_name AS patient_name, p.patient_number, p.phone AS patient_phone
       FROM invoices i JOIN patients p ON p.id = i.patient_id
       ${where} ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Number(limit), offset]
    );
    res.json({ invoices: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/invoices/stats */
const getRevenueStats = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [daily, monthly, yearly, total, unpaid] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND paid_at >= $2`, [cid, todayStart]),
      query(`SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND paid_at >= $2`, [cid, monthStart]),
      query(`SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid' AND paid_at >= $2`, [cid, yearStart]),
      query(`SELECT COALESCE(SUM(total_amount),0) AS val FROM invoices WHERE clinic_id=$1 AND payment_status='Paid'`, [cid]),
      query(`SELECT COUNT(*) AS cnt FROM invoices WHERE clinic_id=$1 AND payment_status IN ('Unpaid','Partial')`, [cid]),
    ]);

    res.json({
      dailyRevenue: parseFloat(daily.rows[0].val),
      monthlyRevenue: parseFloat(monthly.rows[0].val),
      yearlyRevenue: parseFloat(yearly.rows[0].val),
      totalRevenue: parseFloat(total.rows[0].val),
      unpaidInvoices: parseInt(unpaid.rows[0].cnt),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/invoices/:id */
const getInvoice = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, p.full_name AS patient_name, p.patient_number, p.phone AS patient_phone, p.address
       FROM invoices i JOIN patients p ON p.id = i.patient_id
       WHERE i.id = $1 AND i.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Invoice not found' });

    const { rows: items } = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/invoices */
const createInvoice = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const cid = req.user.clinic_id;
    const { patientId, appointmentId, consultationId, items = [], discountPercent = 0,
            taxPercent = 0, paymentMethod = 'Cash', notes, dueDate } = req.body;

    if (!patientId || !items.length)
      return res.status(400).json({ message: 'Patient and items are required' });

    const invoiceNumber = await nextInvoiceNumber(cid);
    const subtotal = items.reduce((s, i) => s + (i.unitPrice * (i.quantity || 1)), 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const totalAmount = afterDiscount + taxAmount;
    const paidAmount = req.body.paidAmount || 0;
    const balanceDue = totalAmount - paidAmount;
    const paymentStatus = balanceDue <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

    const { rows } = await client.query(
      `INSERT INTO invoices (id, clinic_id, patient_id, appointment_id, consultation_id,
         invoice_number, due_date, subtotal, discount_percent, discount_amount,
         tax_percent, tax_amount, total_amount, paid_amount, balance_due,
         payment_method, payment_status, paid_at, notes, created_by)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               $17,$18,$19) RETURNING *`,
      [cid, patientId, appointmentId||null, consultationId||null, invoiceNumber,
       dueDate||null, subtotal, discountPercent, discountAmount,
       taxPercent, taxAmount, totalAmount, paidAmount, balanceDue,
       paymentMethod, paymentStatus, paymentStatus==='Paid' ? new Date() : null,
       notes||null, req.user.id]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
        [rows[0].id, item.description, item.quantity||1, item.unitPrice, item.unitPrice*(item.quantity||1)]
      );
    }

    await client.query('COMMIT');
    const { rows: inv } = await query(`SELECT i.*, p.full_name AS patient_name FROM invoices i JOIN patients p ON p.id=i.patient_id WHERE i.id=$1`, [rows[0].id]);
    const { rows: invItems } = await query('SELECT * FROM invoice_items WHERE invoice_id=$1', [rows[0].id]);
    res.status(201).json({ ...inv[0], items: invItems });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/** POST /api/invoices/:id/pay */
const recordPayment = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const { rows: existing } = await query('SELECT * FROM invoices WHERE id=$1 AND clinic_id=$2', [req.params.id, req.user.clinic_id]);
    if (!existing.length) return res.status(404).json({ message: 'Invoice not found' });

    const inv = existing[0];
    const newPaid = parseFloat(inv.paid_amount) + parseFloat(amount);
    const newBalance = parseFloat(inv.total_amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

    const { rows } = await query(
      `UPDATE invoices SET paid_amount=$1, balance_due=$2, payment_status=$3,
        payment_method=COALESCE($4, payment_method),
        paid_at=CASE WHEN $3='Paid' THEN NOW() ELSE paid_at END,
        updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [newPaid, Math.max(0, newBalance), newStatus, paymentMethod||null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getInvoices, getInvoice, createInvoice, recordPayment, getRevenueStats };
