const { query, getClient } = require('../db/pool');
const { nextSaleNumber } = require('../utils/autoNumber');

/** GET /api/pharmacy/medications */
const getMedications = async (req, res) => {
  try {
    const { search = '', lowStock, page = 1, limit = 20 } = req.query;
    const cid = req.user.clinic_id;
    const conditions = ['clinic_id = $1', 'is_active = true'];
    const params = [cid];
    let idx = 2;

    if (search) { conditions.push(`(name ILIKE $${idx} OR generic_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (lowStock === 'true') { conditions.push(`stock_quantity <= reorder_level`); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await query(`SELECT COUNT(*) AS total FROM medications ${where}`, params);
    const total = parseInt(countRes.rows[0].total);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await query(
      `SELECT * FROM medications ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Number(limit), offset]
    );
    res.json({ medications: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/pharmacy/medications */
const createMedication = async (req, res) => {
  const { name, genericName, category, dosageForm, strength, barcode, stockQuantity,
          reorderLevel, unitPrice, sellingPrice, expiryDate, manufacturer, supplier, storageLocation } = req.body;
  if (!name) return res.status(400).json({ message: 'Medication name is required' });
  try {
    const { rows } = await query(
      `INSERT INTO medications (id, clinic_id, name, generic_name, category, dosage_form, strength,
         barcode, stock_quantity, reorder_level, unit_price, selling_price, expiry_date,
         manufacturer, supplier, storage_location)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.user.clinic_id, name, genericName||null, category||null, dosageForm||null, strength||null,
       barcode||null, stockQuantity||0, reorderLevel||10, unitPrice||0, sellingPrice||0,
       expiryDate||null, manufacturer||null, supplier||null, storageLocation||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/pharmacy/medications/:id */
const updateMedication = async (req, res) => {
  const { name, genericName, category, stockQuantity, sellingPrice, expiryDate,
          reorderLevel, unitPrice, strength, dosageForm } = req.body;
  try {
    const { rows } = await query(
      `UPDATE medications SET
        name = COALESCE($1, name), generic_name = COALESCE($2, generic_name),
        category = COALESCE($3, category), stock_quantity = COALESCE($4, stock_quantity),
        selling_price = COALESCE($5, selling_price), expiry_date = COALESCE($6, expiry_date),
        reorder_level = COALESCE($7, reorder_level), unit_price = COALESCE($8, unit_price),
        strength = COALESCE($9, strength), dosage_form = COALESCE($10, dosage_form),
        updated_at = NOW()
       WHERE id = $11 AND clinic_id = $12 RETURNING *`,
      [name||null, genericName||null, category||null, stockQuantity!=null?stockQuantity:null,
       sellingPrice!=null?sellingPrice:null, expiryDate||null, reorderLevel!=null?reorderLevel:null,
       unitPrice!=null?unitPrice:null, strength||null, dosageForm||null,
       req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Medication not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/pharmacy/sales */
const createSale = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const cid = req.user.clinic_id;
    const { patientId, prescriptionId, items = [], paymentMethod = 'Cash', notes } = req.body;
    if (!items.length) return res.status(400).json({ message: 'Sale items are required' });

    const saleNumber = await nextSaleNumber(cid);
    let totalAmount = 0;

    for (const item of items) {
      const { rows: med } = await client.query(
        'SELECT id, name, stock_quantity, selling_price FROM medications WHERE id=$1 AND clinic_id=$2 AND is_active=true',
        [item.medicationId, cid]
      );
      if (!med.length) throw new Error(`Medication not found: ${item.medicationId}`);
      if (med[0].stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for medication "${med[0].name}" (Available: ${med[0].stock_quantity}, Requested: ${item.quantity})`);
      }
      const unitPrice = Number(item.unitPrice || med[0].selling_price);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      await client.query('UPDATE medications SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id=$2', [item.quantity, item.medicationId]);
    }

    const isCredit = paymentMethod && (
      paymentMethod.toLowerCase().includes('credit') ||
      paymentMethod.toLowerCase().includes('dayn') ||
      paymentMethod.toLowerCase().includes('amaah') ||
      paymentMethod.toLowerCase().includes('loan')
    );
    const paymentStatus = isCredit ? 'Unpaid' : 'Paid';
    const paidAmount = isCredit ? 0 : totalAmount;

    const validMethods = ['Cash','EVC Plus','Zaad','Sahal','Card','Insurance'];
    let safePaymentMethod = isCredit ? 'Other' : (validMethods.includes(paymentMethod) ? paymentMethod : 'Cash');
    const saleNotes = isCredit
      ? (notes ? `[Dayn / Credit] ${notes}` : `[Dayn / Credit]`)
      : (paymentMethod && !validMethods.includes(paymentMethod)
        ? (notes ? `[${paymentMethod}] ${notes}` : `[${paymentMethod}]`)
        : notes);

    const { rows: sale } = await client.query(
      `INSERT INTO pharmacy_sales (id, clinic_id, patient_id, prescription_id, sale_number,
         total_amount, paid_amount, payment_method, payment_status, served_by, notes)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [cid, patientId||null, prescriptionId||null, saleNumber, totalAmount, paidAmount, safePaymentMethod, paymentStatus, req.user.id, saleNotes||null]
    );

    for (const item of items) {
      const { rows: med } = await client.query('SELECT name, selling_price FROM medications WHERE id=$1', [item.medicationId]);
      const unitPrice = Number(item.unitPrice || med[0]?.selling_price || 0);
      item.medicationName = med[0]?.name || 'Medication';
      await client.query(
        `INSERT INTO pharmacy_sale_items (id, sale_id, medication_id, quantity, unit_price, total_price)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
        [sale[0].id, item.medicationId, item.quantity, unitPrice, unitPrice * item.quantity]
      );
    }

    // If sold on credit/dayn and patientId is provided, also create a linked invoice in the clinic's billing system
    if (isCredit && patientId) {
      try {
        const { nextInvoiceNumber } = require('../utils/autoNumber');
        const invoiceNumber = await nextInvoiceNumber(cid);
        const { rows: inv } = await client.query(
          `INSERT INTO invoices (
            id, clinic_id, patient_id, invoice_number, subtotal, total_amount, paid_amount, balance_due,
            payment_method, payment_status, notes, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, 0, $6, 'Other', 'Unpaid', $7, $8
          ) RETURNING id`,
          [
            cid,
            patientId,
            invoiceNumber,
            totalAmount,
            totalAmount,
            totalAmount,
            `[Pharmacy Dayn / Amaah] Sale #${saleNumber}`,
            req.user.id
          ]
        );

        for (const item of items) {
          const unitPrice = Number(item.unitPrice || 0);
          await client.query(
            `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
            [
              inv[0].id,
              `Pharmacy: ${item.medicationName || 'Medication'}`,
              item.quantity,
              unitPrice,
              unitPrice * item.quantity
            ]
          );
        }
      } catch (invErr) {
        console.error('[Pharmacy] Error creating linked credit invoice:', invErr);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(sale[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/** GET /api/pharmacy/sales */
const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const cid = req.user.clinic_id;
    const offset = (Number(page) - 1) * Number(limit);
    const countRes = await query('SELECT COUNT(*) AS total FROM pharmacy_sales WHERE clinic_id=$1', [cid]);
    const total = parseInt(countRes.rows[0].total);
    const { rows } = await query(
      `SELECT ps.*,
              p.full_name AS patient_name,
              p.patient_number,
              u.full_name AS served_by_name
       FROM pharmacy_sales ps
       LEFT JOIN patients p ON p.id = ps.patient_id
       LEFT JOIN clinic_users u ON u.id = ps.served_by
       WHERE ps.clinic_id=$1 ORDER BY ps.created_at DESC LIMIT $2 OFFSET $3`,
      [cid, Number(limit), offset]
    );
    res.json({ sales: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/pharmacy/sales/:id */
const getSaleDetails = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ps.*, p.full_name AS patient_name, p.patient_number, u.full_name AS served_by_name
       FROM pharmacy_sales ps
       LEFT JOIN patients p ON p.id = ps.patient_id
       LEFT JOIN clinic_users u ON u.id = ps.served_by
       WHERE ps.id = $1 AND ps.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Sale not found' });
    const { rows: items } = await query(
      `SELECT psi.*, m.name AS medication_name, m.dosage_form, m.strength
       FROM pharmacy_sale_items psi
       JOIN medications m ON m.id = psi.medication_id
       WHERE psi.sale_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/pharmacy/stats */
const getPharmacyStats = async (req, res) => {
  try {
    const cid = req.user.clinic_id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [todayRes, monthRes, totalMedsRes, totalSalesCount] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total_amount), 0) AS val FROM pharmacy_sales WHERE clinic_id = $1 AND created_at >= $2`,
        [cid, todayStart.toISOString()]
      ),
      query(
        `SELECT COALESCE(SUM(total_amount), 0) AS val FROM pharmacy_sales WHERE clinic_id = $1 AND created_at >= $2`,
        [cid, monthStart.toISOString()]
      ),
      query(
        `SELECT COUNT(*) AS total_items, COALESCE(SUM(stock_quantity * selling_price), 0) AS stock_value FROM medications WHERE clinic_id = $1 AND is_active = true`,
        [cid]
      ),
      query(
        `SELECT COUNT(*) AS count FROM pharmacy_sales WHERE clinic_id = $1`,
        [cid]
      )
    ]);

    res.json({
      todaySales: parseFloat(todayRes.rows[0].val),
      monthSales: parseFloat(monthRes.rows[0].val),
      totalTransactions: parseInt(totalSalesCount.rows[0].count),
      totalMedications: parseInt(totalMedsRes.rows[0].total_items),
      inventoryValue: parseFloat(totalMedsRes.rows[0].stock_value)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/pharmacy/low-stock */
const getLowStock = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM medications WHERE clinic_id=$1 AND is_active=true AND stock_quantity <= reorder_level ORDER BY stock_quantity ASC',
      [req.user.clinic_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMedications,
  createMedication,
  updateMedication,
  createSale,
  getSales,
  getSaleDetails,
  getPharmacyStats,
  getLowStock
};
