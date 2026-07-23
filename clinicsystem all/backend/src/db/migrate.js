/**
 * migrate.js — Creates all PostgreSQL tables for Datel Clinic System.
 *
 * Run: node src/db/migrate.js
 * Fresh: node src/db/migrate.js --fresh  (drops all tables first)
 */

require('dotenv').config();
const { pool } = require('./pool');

const FRESH = process.argv.includes('--fresh');

const DROP_ALL = `
  DROP TABLE IF EXISTS notifications CASCADE;
  DROP TABLE IF EXISTS lab_results CASCADE;
  DROP TABLE IF EXISTS lab_requests CASCADE;
  DROP TABLE IF EXISTS pharmacy_sales CASCADE;
  DROP TABLE IF EXISTS pharmacy_sale_items CASCADE;
  DROP TABLE IF EXISTS medications CASCADE;
  DROP TABLE IF EXISTS invoice_items CASCADE;
  DROP TABLE IF EXISTS invoices CASCADE;
  DROP TABLE IF EXISTS prescriptions CASCADE;
  DROP TABLE IF EXISTS consultation_notes CASCADE;
  DROP TABLE IF EXISTS appointments CASCADE;
  DROP TABLE IF EXISTS medical_history CASCADE;
  DROP TABLE IF EXISTS patients CASCADE;
  DROP TABLE IF EXISTS clinic_users CASCADE;
  DROP TABLE IF EXISTS clinics CASCADE;
`;

const CREATE_TABLES = `

-- ============================================================
-- CLINICS (one row per licensed clinic tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  phone                 VARCHAR(50),
  address               TEXT,
  city                  VARCHAR(100),
  country               VARCHAR(100) DEFAULT 'Somalia',
  logo_url              TEXT,
  license_key           VARCHAR(255) UNIQUE NOT NULL,
  subscription_plan     VARCHAR(50)  DEFAULT 'Trial'
                          CHECK (subscription_plan IN ('Trial','Monthly','Quarterly','SemiAnnual','Annual','Lifetime')),
  subscription_status   VARCHAR(50)  DEFAULT 'Trial'
                          CHECK (subscription_status IN ('Active','Trial','Expired','Suspended')),
  subscription_start    TIMESTAMPTZ,
  subscription_expiry   TIMESTAMPTZ,
  days_remaining        INTEGER DEFAULT 14,
  currency              VARCHAR(10)  DEFAULT 'USD',
  timezone              VARCHAR(100) DEFAULT 'Africa/Mogadishu',
  working_hours_start   VARCHAR(10)  DEFAULT '08:00',
  working_hours_end     VARCHAR(10)  DEFAULT '17:00',
  working_days          TEXT[]       DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Saturday'],
  is_active             BOOLEAN      DEFAULT TRUE,
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- CLINIC USERS (staff per clinic)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  DEFAULT 'receptionist'
                    CHECK (role IN ('super_admin','clinic_manager','doctor','receptionist','pharmacist','lab_staff','accountant')),
  phone           VARCHAR(50),
  specialization  VARCHAR(100),
  avatar_url      TEXT,
  is_active       BOOLEAN      DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic_id ON clinic_users(clinic_id);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_number        VARCHAR(20) NOT NULL,
  full_name             VARCHAR(255) NOT NULL,
  date_of_birth         DATE,
  gender                VARCHAR(20)  CHECK (gender IN ('Male','Female','Other')),
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
  address               TEXT,
  city                  VARCHAR(100),
  national_id           VARCHAR(100),
  blood_type            VARCHAR(10)  DEFAULT 'Unknown'
                          CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown')),
  emergency_name        VARCHAR(255),
  emergency_phone       VARCHAR(50),
  emergency_relation    VARCHAR(100),
  allergies             TEXT[],
  chronic_conditions    TEXT[],
  insurance_provider    VARCHAR(255),
  insurance_policy_no   VARCHAR(100),
  notes                 TEXT,
  is_active             BOOLEAN      DEFAULT TRUE,
  registered_by         UUID REFERENCES clinic_users(id),
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(clinic_id, patient_number)
);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id    ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_full_name    ON patients USING GIN (to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_patients_phone        ON patients(phone);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id),
  doctor_id           UUID NOT NULL REFERENCES clinic_users(id),
  appointment_number  VARCHAR(20) NOT NULL,
  appointment_date    DATE NOT NULL,
  time_slot           VARCHAR(10) NOT NULL,
  duration_minutes    INTEGER DEFAULT 30,
  type                VARCHAR(50) DEFAULT 'Consultation'
                        CHECK (type IN ('Consultation','Follow-Up','Check-Up','Procedure','Emergency','Vaccination')),
  status              VARCHAR(50) DEFAULT 'Scheduled'
                        CHECK (status IN ('Scheduled','Confirmed','Checked-In','In Progress','Completed','Cancelled','No Show')),
  chief_complaint     TEXT,
  notes               TEXT,
  cancel_reason       TEXT,
  created_by          UUID REFERENCES clinic_users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, appointment_number)
);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date   ON appointments(clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor        ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient       ON appointments(patient_id);

-- ============================================================
-- CONSULTATION NOTES (Doctors only)
-- ============================================================
CREATE TABLE IF NOT EXISTS consultation_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id               UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id          UUID REFERENCES appointments(id),
  patient_id              UUID NOT NULL REFERENCES patients(id),
  doctor_id               UUID NOT NULL REFERENCES clinic_users(id),
  record_number           VARCHAR(20) NOT NULL,
  visit_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint         TEXT,
  history_of_illness      TEXT,
  bp_systolic             INTEGER,
  bp_diastolic            INTEGER,
  heart_rate              INTEGER,
  temperature             NUMERIC(5,2),
  respiratory_rate        INTEGER,
  oxygen_saturation       NUMERIC(5,2),
  weight_kg               NUMERIC(6,2),
  height_cm               NUMERIC(6,2),
  bmi                     NUMERIC(5,2),
  blood_sugar             NUMERIC(6,2),
  physical_examination    TEXT,
  diagnosis               TEXT[],
  diagnosis_notes         TEXT,
  treatment_plan          TEXT,
  follow_up_date          DATE,
  follow_up_notes         TEXT,
  referred_to             VARCHAR(255),
  referral_reason         TEXT,
  notes                   TEXT,
  is_signed               BOOLEAN      DEFAULT FALSE,
  signed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(clinic_id, record_number)
);
CREATE INDEX IF NOT EXISTS idx_consult_clinic_patient ON consultation_notes(clinic_id, patient_id);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  consultation_id   UUID NOT NULL REFERENCES consultation_notes(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id),
  doctor_id         UUID NOT NULL REFERENCES clinic_users(id),
  medication_name   VARCHAR(255) NOT NULL,
  dosage            VARCHAR(100),
  frequency         VARCHAR(100),
  duration          VARCHAR(100),
  instructions      TEXT,
  is_dispensed      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient      ON prescriptions(patient_id);

-- ============================================================
-- MEDICATIONS (Pharmacy Inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  generic_name        VARCHAR(255),
  category            VARCHAR(100),
  dosage_form         VARCHAR(100),
  strength            VARCHAR(100),
  barcode             VARCHAR(100),
  stock_quantity      INTEGER DEFAULT 0,
  reorder_level       INTEGER DEFAULT 10,
  unit_price          NUMERIC(12,2) DEFAULT 0,
  selling_price       NUMERIC(12,2) DEFAULT 0,
  expiry_date         DATE,
  manufacturer        VARCHAR(255),
  supplier            VARCHAR(255),
  storage_location    VARCHAR(100),
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medications_clinic ON medications(clinic_id);

-- ============================================================
-- PHARMACY SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES patients(id),
  prescription_id UUID REFERENCES prescriptions(id),
  sale_number     VARCHAR(20) NOT NULL,
  sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount    NUMERIC(12,2) DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  payment_method  VARCHAR(50) DEFAULT 'Cash'
                    CHECK (payment_method IN ('Cash','EVC Plus','Zaad','Sahal','Card','Insurance')),
  payment_status  VARCHAR(50) DEFAULT 'Paid'
                    CHECK (payment_status IN ('Paid','Unpaid','Partial')),
  served_by       UUID REFERENCES clinic_users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_clinic ON pharmacy_sales(clinic_id);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
  medication_id   UUID NOT NULL REFERENCES medications(id),
  quantity        INTEGER NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  total_price     NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- LAB REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id),
  doctor_id         UUID NOT NULL REFERENCES clinic_users(id),
  consultation_id   UUID REFERENCES consultation_notes(id),
  request_number    VARCHAR(20) NOT NULL,
  test_name         VARCHAR(255) NOT NULL,
  test_category     VARCHAR(100),
  priority          VARCHAR(20) DEFAULT 'Routine'
                      CHECK (priority IN ('Routine','Urgent','STAT')),
  status            VARCHAR(50) DEFAULT 'Requested'
                      CHECK (status IN ('Requested','Sample Collected','In Progress','Completed','Cancelled')),
  requested_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  sample_collected  TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, request_number)
);
CREATE INDEX IF NOT EXISTS idx_lab_requests_clinic   ON lab_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient  ON lab_requests(patient_id);

CREATE TABLE IF NOT EXISTS lab_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
  clinic_id       UUID NOT NULL REFERENCES clinics(id),
  parameter_name  VARCHAR(255) NOT NULL,
  result_value    VARCHAR(255),
  unit            VARCHAR(50),
  reference_range VARCHAR(100),
  interpretation  VARCHAR(50) DEFAULT 'Normal'
                    CHECK (interpretation IN ('Normal','Low','High','Critical')),
  notes           TEXT,
  entered_by      UUID REFERENCES clinic_users(id),
  entered_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id),
  appointment_id    UUID REFERENCES appointments(id),
  consultation_id   UUID REFERENCES consultation_notes(id),
  invoice_number    VARCHAR(20) NOT NULL,
  invoice_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  subtotal          NUMERIC(12,2) DEFAULT 0,
  discount_percent  NUMERIC(5,2)  DEFAULT 0,
  discount_amount   NUMERIC(12,2) DEFAULT 0,
  tax_percent       NUMERIC(5,2)  DEFAULT 0,
  tax_amount        NUMERIC(12,2) DEFAULT 0,
  total_amount      NUMERIC(12,2) DEFAULT 0,
  paid_amount       NUMERIC(12,2) DEFAULT 0,
  balance_due       NUMERIC(12,2) DEFAULT 0,
  payment_method    VARCHAR(50)   DEFAULT 'Cash'
                      CHECK (payment_method IN ('Cash','EVC Plus','Zaad','Sahal','Card','Insurance','Other')),
  payment_status    VARCHAR(50)   DEFAULT 'Unpaid'
                      CHECK (payment_status IN ('Unpaid','Partial','Paid','Refunded','Waived')),
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID REFERENCES clinic_users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic        ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient       ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status        ON invoices(payment_status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   VARCHAR(255) NOT NULL,
  quantity      INTEGER DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES clinic_users(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  link        VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting migration...');

    if (FRESH) {
      console.log('⚠️  Fresh mode: dropping all tables...');
      await client.query(DROP_ALL);
    }

    await client.query(CREATE_TABLES);
    console.log('✅ Migration complete — all tables created.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
