/**
 * seed.js — Seeds demo data for Datel Clinic System.
 * Run: node src/db/seed.js
 */

require('dotenv').config();
const { query, pool } = require('./pool');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    console.log('🌱 Seeding demo data...\n');

    // ── 1. Create demo clinic ─────────────────────────────────────────────────
    const clinicId = uuidv4();
    await query(`
      INSERT INTO clinics (id, name, email, phone, address, city, country, license_key,
        subscription_plan, subscription_status, subscription_expiry, days_remaining, currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (email) DO NOTHING
    `, [
      clinicId,
      'Datel Medical Clinic',
      'clinic@datelclinic.com',
      '+252 61 1234567',
      '123 Main Street, Hamar Weyne',
      'Mogadishu',
      'Somalia',
      'DEMO-LICENSE-KEY-2024',
      'Monthly',
      'Active',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      30,
      'USD',
    ]);

    const { rows: [clinic] } = await query('SELECT id FROM clinics WHERE email=$1', ['clinic@datelclinic.com']);
    const cId = clinic.id;
    console.log('✅ Clinic created:', cId);

    // ── 2. Create staff users ─────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Demo@1234', 10);
    const adminId = uuidv4();
    const doctorId = uuidv4();
    const receptionistId = uuidv4();

    const users = [
      [adminId, cId, 'Clinic Admin', 'admin@datelclinic.com', passwordHash, 'clinic_manager', '+252 61 1111111', null],
      [doctorId, cId, 'Dr. Ahmed Hassan', 'doctor@datelclinic.com', passwordHash, 'doctor', '+252 61 2222222', 'General Medicine'],
      [receptionistId, cId, 'Fadumo Warsame', 'reception@datelclinic.com', passwordHash, 'receptionist', '+252 61 3333333', null],
    ];

    for (const u of users) {
      await query(`
        INSERT INTO clinic_users (id, clinic_id, full_name, email, password_hash, role, phone, specialization)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (email) DO NOTHING
      `, u);
    }
    console.log('✅ Staff users created');

    // ── 3. Create demo patients ───────────────────────────────────────────────
    const patients = [
      ['P-0001', 'Ahmed Ibrahim Ali', '1985-06-15', 'Male', '+252 61 5001001', 'A+'],
      ['P-0002', 'Hodan Abdi Mohamed', '1990-03-22', 'Female', '+252 61 5001002', 'O+'],
      ['P-0003', 'Omar Farah Hassan', '1978-11-10', 'Male', '+252 61 5001003', 'B+'],
      ['P-0004', 'Faadumo Yusuf Warsame', '2001-08-05', 'Female', '+252 61 5001004', 'AB+'],
      ['P-0005', 'Mahad Nur Osman', '1995-01-30', 'Male', '+252 61 5001005', 'A-'],
    ];

    const patientIds = [];
    for (const p of patients) {
      const pid = uuidv4();
      patientIds.push(pid);
      await query(`
        INSERT INTO patients (id, clinic_id, patient_number, full_name, date_of_birth, gender, phone, blood_type, registered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [pid, cId, p[0], p[1], p[2], p[3], p[4], p[5], receptionistId]);
    }
    console.log('✅ Patients created:', patientIds.length);

    // ── 4. Create appointments ────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const appts = [
      ['APT-0001', patientIds[0], '09:00', 'Consultation', 'Scheduled'],
      ['APT-0002', patientIds[1], '10:00', 'Follow-Up', 'Confirmed'],
      ['APT-0003', patientIds[2], '11:00', 'Check-Up', 'Checked-In'],
      ['APT-0004', patientIds[3], '14:00', 'Consultation', 'Scheduled'],
      ['APT-0005', patientIds[4], '15:00', 'Consultation', 'Scheduled'],
    ];

    for (const a of appts) {
      await query(`
        INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, appointment_number,
          appointment_date, time_slot, type, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT DO NOTHING
      `, [uuidv4(), cId, a[1], doctorId, a[0], today, a[2], a[3], a[4], receptionistId]);
    }
    console.log('✅ Appointments created:', appts.length);

    // ── 5. Create medications ─────────────────────────────────────────────────
    const meds = [
      ['Paracetamol 500mg', 'Acetaminophen', 'Analgesic', 'Tablet', '500mg', 100, 3.50],
      ['Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic', 'Capsule', '250mg', 50, 8.00],
      ['Ibuprofen 400mg', 'Ibuprofen', 'NSAID', 'Tablet', '400mg', 80, 5.00],
      ['Metformin 500mg', 'Metformin HCl', 'Antidiabetic', 'Tablet', '500mg', 60, 6.50],
      ['Omeprazole 20mg', 'Omeprazole', 'PPI', 'Capsule', '20mg', 40, 12.00],
    ];

    for (const m of meds) {
      await query(`
        INSERT INTO medications (id, clinic_id, name, generic_name, category, dosage_form, strength,
          stock_quantity, selling_price, expiry_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT DO NOTHING
      `, [uuidv4(), cId, m[0], m[1], m[2], m[3], m[4], m[5], m[6],
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    }
    console.log('✅ Medications created:', meds.length);

    // ── 6. Create sample invoice ──────────────────────────────────────────────
    const invId = uuidv4();
    await query(`
      INSERT INTO invoices (id, clinic_id, patient_id, invoice_number, subtotal, total_amount, paid_amount, balance_due, payment_status, paid_at, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT DO NOTHING
    `, [invId, cId, patientIds[0], 'INV-0001', 50, 50, 50, 0, 'Paid', new Date(), adminId]);

    await query(`
      INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT DO NOTHING
    `, [uuidv4(), invId, 'General Consultation', 1, 50, 50]);
    console.log('✅ Sample invoice created');

    console.log('\n🎉 Seeding complete!\n');
    console.log('Login credentials:');
    console.log('  Admin/Manager : admin@datelclinic.com   | Demo@1234');
    console.log('  Doctor        : doctor@datelclinic.com  | Demo@1234');
    console.log('  Receptionist  : reception@datelclinic.com | Demo@1234');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
