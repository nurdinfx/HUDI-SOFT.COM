// backend/src/controllers/dentalController.js
const { query } = require('../db/pool');
const { STANDARD_DENTAL_TREATMENTS } = require('../utils/seedDentalTreatments');

// ══════════════════════════════════════════════════════════════
// 1. DENTAL TREATMENT CATALOG
// ══════════════════════════════════════════════════════════════

/** GET /api/dental/treatments */
const getTreatments = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';

    const { rows } = await query(
      `SELECT * FROM dental_treatments
       WHERE clinic_id = $1 ${includeInactive ? '' : 'AND is_active = true'}
       ORDER BY category ASC, treatment_name ASC`,
      [clinicId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Dental] getTreatments error:', err);
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/treatments */
const createTreatment = async (req, res) => {
  const { category, treatmentName, code, description, defaultPrice, durationMinutes, requiredMaterials } = req.body;
  if (!category || !treatmentName) {
    return res.status(400).json({ message: 'Category and treatment name are required' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO dental_treatments (
        clinic_id, category, treatment_name, code, description, default_price, duration_minutes, required_materials
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.user.clinic_id, category, treatmentName,
        code || null, description || null,
        Number(defaultPrice) || 0, Number(durationMinutes) || 30,
        requiredMaterials || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/dental/treatments/:id */
const updateTreatment = async (req, res) => {
  const { category, treatmentName, code, description, defaultPrice, durationMinutes, requiredMaterials, isActive } = req.body;
  try {
    const { rows } = await query(
      `UPDATE dental_treatments SET
        category = COALESCE($1, category),
        treatment_name = COALESCE($2, treatment_name),
        code = COALESCE($3, code),
        description = COALESCE($4, description),
        default_price = COALESCE($5, default_price),
        duration_minutes = COALESCE($6, duration_minutes),
        required_materials = COALESCE($7, required_materials),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
      [
        category || null, treatmentName || null, code || null, description || null,
        defaultPrice !== undefined ? Number(defaultPrice) : null,
        durationMinutes !== undefined ? Number(durationMinutes) : null,
        requiredMaterials || null, isActive !== undefined ? isActive : null,
        req.params.id, req.user.clinic_id
      ]
    );
    if (!rows.length) return res.status(404).json({ message: 'Treatment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** DELETE /api/dental/treatments/:id (Permanent delete single procedure) */
const deleteTreatment = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM dental_treatments WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Treatment not found' });
    res.json({ message: 'Treatment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** DELETE /api/dental/treatments/clear-all (Clear all procedures for this clinic) */
const clearAllTreatments = async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM dental_treatments WHERE clinic_id = $1`,
      [req.user.clinic_id]
    );
    res.json({ message: `Successfully cleared ${rowCount || 0} procedures`, count: rowCount || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/treatments/seed-template (Load optional standard 34-procedure template) */
const seedTemplateTreatments = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    for (const t of STANDARD_DENTAL_TREATMENTS) {
      await query(
        `INSERT INTO dental_treatments (
          clinic_id, category, treatment_name, code, description, default_price, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING`,
        [clinicId, t.category, t.name, t.code, t.description, t.price, t.duration]
      );
    }
    const { rows } = await query(
      `SELECT * FROM dental_treatments WHERE clinic_id = $1 AND is_active = true ORDER BY category ASC, treatment_name ASC`,
      [clinicId]
    );
    res.json({ message: 'Standard dental procedures template loaded successfully', count: rows.length, treatments: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 2. ODONTOGRAM & DENTAL CHARTS
// ══════════════════════════════════════════════════════════════

/** GET /api/dental/charts */
const getPatientCharts = async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

  try {
    const { rows } = await query(
      `SELECT dc.*, cu.full_name AS doctor_name, p.full_name AS patient_name
       FROM dental_charts dc
       LEFT JOIN clinic_users cu ON cu.id = dc.doctor_id
       JOIN patients p ON p.id = dc.patient_id
       WHERE dc.clinic_id = $1 AND dc.patient_id = $2
       ORDER BY dc.created_at DESC`,
      [req.user.clinic_id, patientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dental/charts/latest */
const getLatestPatientChart = async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

  try {
    const { rows } = await query(
      `SELECT dc.*, cu.full_name AS doctor_name
       FROM dental_charts dc
       LEFT JOIN clinic_users cu ON cu.id = dc.doctor_id
       WHERE dc.clinic_id = $1 AND dc.patient_id = $2
       ORDER BY dc.created_at DESC LIMIT 1`,
      [req.user.clinic_id, patientId]
    );
    if (!rows.length) {
      return res.json({ patientId, chartType: 'Adult', teethData: [] });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/charts */
const savePatientChart = async (req, res) => {
  const { patientId, chartType, teethData, generalNotes, occlusionNotes, periodontalNotes, isSigned } = req.body;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

  try {
    const { rows } = await query(
      `INSERT INTO dental_charts (
        clinic_id, patient_id, doctor_id, chart_type, teeth_data,
        general_notes, occlusion_notes, periodontal_notes, is_signed, signed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.clinic_id, patientId, req.user.id,
        chartType || 'Adult', JSON.stringify(teethData || []),
        generalNotes || null, occlusionNotes || null, periodontalNotes || null,
        !!isSigned, isSigned ? new Date() : null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 3. TREATMENT PLANNING & WORKFLOW
// ══════════════════════════════════════════════════════════════

/** GET /api/dental/plans */
const getTreatmentPlans = async (req, res) => {
  const { patientId, status } = req.query;
  try {
    let sql = `
      SELECT tp.*, p.full_name AS patient_name, cu.full_name AS doctor_name,
        (SELECT COUNT(*) FROM treatment_plan_items WHERE treatment_plan_id = tp.id) AS total_items,
        (SELECT COUNT(*) FROM treatment_plan_items WHERE treatment_plan_id = tp.id AND status = 'Completed') AS completed_items
      FROM treatment_plans tp
      JOIN patients p ON p.id = tp.patient_id
      LEFT JOIN clinic_users cu ON cu.id = tp.doctor_id
      WHERE tp.clinic_id = $1
    `;
    const params = [req.user.clinic_id];

    if (patientId) {
      params.push(patientId);
      sql += ` AND tp.patient_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND tp.status = $${params.length}`;
    }

    sql += ` ORDER BY tp.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/dental/plans/:id */
const getTreatmentPlanById = async (req, res) => {
  try {
    const { rows: planRows } = await query(
      `SELECT tp.*, p.full_name AS patient_name, p.phone AS patient_phone, cu.full_name AS doctor_name
       FROM treatment_plans tp
       JOIN patients p ON p.id = tp.patient_id
       LEFT JOIN clinic_users cu ON cu.id = tp.doctor_id
       WHERE tp.id = $1 AND tp.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!planRows.length) return res.status(404).json({ message: 'Treatment plan not found' });

    const plan = planRows[0];
    const { rows: itemRows } = await query(
      `SELECT tpi.*, dt.category AS treatment_category, cu.full_name AS completed_by_name
       FROM treatment_plan_items tpi
       LEFT JOIN dental_treatments dt ON dt.id = tpi.treatment_id
       LEFT JOIN clinic_users cu ON cu.id = tpi.completed_by
       WHERE tpi.treatment_plan_id = $1
       ORDER BY tpi.stage ASC, tpi.session_number ASC, tpi.created_at ASC`,
      [plan.id]
    );

    plan.items = itemRows;
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/plans */
const createTreatmentPlan = async (req, res) => {
  const { patientId, title, clinicalNotes, items } = req.body;
  if (!patientId || !title) {
    return res.status(400).json({ message: 'Patient ID and plan title are required' });
  }

  try {
    const planNumber = 'TP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate total cost from items
    const totalCost = (items || []).reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0);

    const { rows: planRows } = await query(
      `INSERT INTO treatment_plans (
        clinic_id, patient_id, doctor_id, plan_number, title, total_estimated_cost, clinical_notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Proposed')
      RETURNING *`,
      [req.user.clinic_id, patientId, req.user.id, planNumber, title, totalCost, clinicalNotes || null]
    );

    const planId = planRows[0].id;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO treatment_plan_items (
            treatment_plan_id, treatment_id, treatment_name, tooth_number, surfaces, stage, session_number, estimated_cost, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            planId, item.treatmentId || null, item.treatmentName,
            item.toothNumber || null, item.surfaces || null,
            Number(item.stage) || 1, Number(item.sessionNumber) || 1,
            Number(item.estimatedCost) || 0, item.notes || null
          ]
        );
      }
    }

    const createdPlan = await getTreatmentPlanByIdHelper(planId, req.user.clinic_id);
    res.status(201).json(createdPlan);
  } catch (err) {
    console.error('createTreatmentPlan error:', err);
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/dental/plans/:id */
const updateTreatmentPlan = async (req, res) => {
  const { title, status, patientConsent, clinicalNotes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE treatment_plans SET
        title = COALESCE($1, title),
        status = COALESCE($2, status),
        patient_consent = COALESCE($3, patient_consent),
        consent_signed_at = CASE WHEN $3 = true AND patient_consent = false THEN NOW() ELSE consent_signed_at END,
        clinical_notes = COALESCE($4, clinical_notes),
        updated_at = NOW()
       WHERE id = $5 AND clinic_id = $6
       RETURNING *`,
      [title || null, status || null, patientConsent !== undefined ? patientConsent : null, clinicalNotes || null, req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Treatment plan not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /api/dental/plans/items/:itemId/status */
const updatePlanItemStatus = async (req, res) => {
  const { status, notes } = req.body;
  try {
    const isCompleted = status === 'Completed';
    const { rows } = await query(
      `UPDATE treatment_plan_items SET
        status = $1,
        notes = COALESCE($2, notes),
        completed_at = CASE WHEN $1 = 'Completed' THEN NOW() ELSE completed_at END,
        completed_by = CASE WHEN $1 = 'Completed' THEN $3 ELSE completed_by END,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, req.user.id, req.params.itemId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function getTreatmentPlanByIdHelper(id, clinicId) {
  const { rows } = await query('SELECT * FROM treatment_plans WHERE id = $1 AND clinic_id = $2', [id, clinicId]);
  if (!rows.length) return null;
  const plan = rows[0];
  const { rows: items } = await query('SELECT * FROM treatment_plan_items WHERE treatment_plan_id = $1 ORDER BY stage ASC, session_number ASC', [id]);
  plan.items = items;
  return plan;
}

// ══════════════════════════════════════════════════════════════
// 4. DENTAL LABORATORY ORDERS
// ══════════════════════════════════════════════════════════════

/** GET /api/dental/lab-orders */
const getLabOrders = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT dlo.*, p.full_name AS patient_name, cu.full_name AS doctor_name
       FROM dental_lab_orders dlo
       JOIN patients p ON p.id = dlo.patient_id
       LEFT JOIN clinic_users cu ON cu.id = dlo.doctor_id
       WHERE dlo.clinic_id = $1
       ORDER BY dlo.created_at DESC`,
      [req.user.clinic_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/lab-orders */
const createLabOrder = async (req, res) => {
  const { patientId, labName, orderType, toothNumbers, shadeGuide, instructions, dueDate, labCost } = req.body;
  if (!patientId || !labName || !orderType) {
    return res.status(400).json({ message: 'Patient, lab name, and order type are required' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO dental_lab_orders (
        clinic_id, patient_id, doctor_id, lab_name, order_type, tooth_numbers,
        shade_guide, instructions, sent_date, due_date, lab_cost, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, 'Sent to Laboratory')
      RETURNING *`,
      [
        req.user.clinic_id, patientId, req.user.id, labName, orderType,
        toothNumbers || null, shadeGuide || null, instructions || null,
        dueDate || null, Number(labCost) || 0
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/dental/lab-orders/:id */
const updateLabOrder = async (req, res) => {
  const { status, deliveredDate, paymentStatus, labCost, instructions } = req.body;
  try {
    const { rows } = await query(
      `UPDATE dental_lab_orders SET
        status = COALESCE($1, status),
        delivered_date = COALESCE($2, delivered_date),
        payment_status = COALESCE($3, payment_status),
        lab_cost = COALESCE($4, lab_cost),
        instructions = COALESCE($5, instructions),
        updated_at = NOW()
       WHERE id = $6 AND clinic_id = $7
       RETURNING *`,
      [status || null, deliveredDate || null, paymentStatus || null, labCost !== undefined ? Number(labCost) : null, instructions || null, req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 5. DENTAL IMAGING & DOCUMENT MANAGEMENT
// ══════════════════════════════════════════════════════════════

/** GET /api/dental/images */
const getDentalImages = async (req, res) => {
  const { patientId } = req.query;
  try {
    let sql = `
      SELECT di.*, p.full_name AS patient_name, cu.full_name AS doctor_name
      FROM dental_images di
      JOIN patients p ON p.id = di.patient_id
      LEFT JOIN clinic_users cu ON cu.id = di.doctor_id
      WHERE di.clinic_id = $1
    `;
    const params = [req.user.clinic_id];

    if (patientId) {
      params.push(patientId);
      sql += ` AND di.patient_id = $${params.length}`;
    }

    sql += ` ORDER BY di.taken_at DESC, di.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/dental/images */
const createDentalImage = async (req, res) => {
  const { patientId, imageType, title, imageUrl, toothNumbers, clinicalNotes, takenAt } = req.body;
  if (!patientId || !title || !imageUrl) {
    return res.status(400).json({ message: 'Patient, title, and image URL are required' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO dental_images (
        clinic_id, patient_id, doctor_id, image_type, title, image_url, tooth_numbers, clinical_notes, taken_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.user.clinic_id, patientId, req.user.id, imageType || 'Panoramic',
        title, imageUrl, toothNumbers || null, clinicalNotes || null, takenAt || new Date()
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 6. BACKWARD COMPATIBILITY: Legacy Dental Records
// ══════════════════════════════════════════════════════════════

const getDentalRecords = async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });
  try {
    const { rows } = await query(
      `SELECT dc.*, cu.full_name AS doctor_name, p.full_name AS patient_name
       FROM dental_charts dc
       LEFT JOIN clinic_users cu ON cu.id = dc.doctor_id
       JOIN patients p ON p.id = dc.patient_id
       WHERE dc.clinic_id = $1 AND dc.patient_id = $2
       ORDER BY dc.created_at DESC`,
      [req.user.clinic_id, patientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDentalRecordById = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT dc.*, cu.full_name AS doctor_name, p.full_name AS patient_name
       FROM dental_charts dc
       LEFT JOIN clinic_users cu ON cu.id = dc.doctor_id
       JOIN patients p ON p.id = dc.patient_id
       WHERE dc.id = $1 AND dc.clinic_id = $2`,
      [req.params.id, req.user.clinic_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Dental chart not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createDentalRecord = async (req, res) => {
  return savePatientChart(req, res);
};

const updateDentalRecord = async (req, res) => {
  res.json({ message: 'Updated' });
};

module.exports = {
  // Treatments
  getTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  clearAllTreatments,
  seedTemplateTreatments,
  // Odontogram
  getPatientCharts,
  getLatestPatientChart,
  savePatientChart,
  // Treatment Plans
  getTreatmentPlans,
  getTreatmentPlanById,
  createTreatmentPlan,
  updateTreatmentPlan,
  updatePlanItemStatus,
  // Lab Orders
  getLabOrders,
  createLabOrder,
  updateLabOrder,
  // Imaging
  getDentalImages,
  createDentalImage,
  // Backward compatibility
  getDentalRecords,
  getDentalRecordById,
  createDentalRecord,
  updateDentalRecord
};
