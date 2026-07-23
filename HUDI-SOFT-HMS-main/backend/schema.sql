-- HMS PostgreSQL Schema for Supabase
-- TRUE MULTI-TENANT: every table has tenant_id for complete data isolation

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,               -- NOT globally unique — scoped per tenant below
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    avatar TEXT,
    is_active INTEGER DEFAULT 1,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_key ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY,
    patient_id TEXT,                   -- tenant-scoped, not globally unique
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gender TEXT,
    date_of_birth DATE,
    blood_group TEXT,
    address TEXT,
    city TEXT,
    status TEXT DEFAULT 'active',
    allergies TEXT DEFAULT '[]',
    chronic_conditions TEXT DEFAULT '[]',
    emergency_contact TEXT,
    emergency_phone TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP,
    notes TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS patients_tenant_pid_key ON patients(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients(tenant_id);

-- 3. Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY,
    doctor_id TEXT,                    -- tenant-scoped, not globally unique
    name TEXT NOT NULL,
    specialization TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'available',
    department TEXT,
    qualification TEXT,
    experience INTEGER DEFAULT 0,
    consultation_fee NUMERIC DEFAULT 50,
    available_days TEXT DEFAULT '[]',
    available_time_start TEXT DEFAULT '09:00',
    available_time_end TEXT DEFAULT '17:00',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS doctors_tenant_did_key ON doctors(tenant_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant_id ON doctors(tenant_id);

-- 4. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY,
    appointment_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name TEXT,
    department TEXT,
    date DATE,
    time TEXT,
    type TEXT DEFAULT 'consultation',
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_tenant_aid_key ON appointments(tenant_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- 5. Medicines
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT,
    manufacturer TEXT,
    batch_number TEXT,
    expiry_date DATE,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'tablet',
    status TEXT DEFAULT 'in-stock',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE INDEX IF NOT EXISTS idx_medicines_tenant_id ON medicines(tenant_id);

-- 6. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY,
    prescription_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name TEXT,
    appointment_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    medicines TEXT DEFAULT '[]',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_tenant_pid_key ON prescriptions(tenant_id, prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant_id ON prescriptions(tenant_id);

-- 7. Lab Tests
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY,
    test_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name TEXT,
    test_name TEXT,
    test_category TEXT,
    sample_type TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'ordered',
    results TEXT,
    normal_range TEXT,
    report_url TEXT,
    cost NUMERIC DEFAULT 0,
    critical_flag INTEGER DEFAULT 0,
    technician_id UUID,
    clinical_notes TEXT,
    is_billed INTEGER DEFAULT 0,
    invoice_id UUID,
    admission_id UUID,
    ordered_by TEXT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    sample_collected_at TIMESTAMP,
    sample_collected_by TEXT,
    sample_barcode TEXT,
    result_entered_by TEXT,
    result_entered_at TIMESTAMP,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE UNIQUE INDEX IF NOT EXISTS lab_tests_tenant_tid_key ON lab_tests(tenant_id, test_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_tenant_id ON lab_tests(tenant_id);

-- 8. Lab Catalog
CREATE TABLE IF NOT EXISTS lab_catalog (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    sample_type TEXT,
    normal_range TEXT,
    cost NUMERIC DEFAULT 0,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE INDEX IF NOT EXISTS idx_lab_catalog_tenant_id ON lab_catalog(tenant_id);

-- 9. Lab Audit Logs
CREATE TABLE IF NOT EXISTS lab_audit_logs (
    id UUID PRIMARY KEY,
    lab_test_id UUID REFERENCES lab_tests(id) ON DELETE CASCADE,
    action TEXT,
    performed_by TEXT,
    details TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lab_audit_tenant_id ON lab_audit_logs(tenant_id);

-- 10. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY,
    invoice_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    items TEXT DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    notes TEXT,
    insurance_claim TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_iid_key ON invoices(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

-- 11. OPD Visits
CREATE TABLE IF NOT EXISTS opd_visits (
    id UUID PRIMARY KEY,
    visit_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name TEXT,
    department TEXT,
    date DATE DEFAULT CURRENT_DATE,
    time TEXT,
    chief_complaint TEXT,
    history_illness TEXT,
    past_history TEXT,
    family_history TEXT,
    physical_examination TEXT,
    clinical_notes TEXT,
    vitals TEXT DEFAULT '{}',
    diagnosis TEXT,
    status TEXT DEFAULT 'waiting',
    token_number INTEGER,
    visit_type TEXT DEFAULT 'New',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS opd_visits_tenant_vid_key ON opd_visits(tenant_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_opd_visits_tenant_id ON opd_visits(tenant_id);

-- 12. IPD Admissions
CREATE TABLE IF NOT EXISTS ipd_admissions (
    id UUID PRIMARY KEY,
    admission_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name TEXT,
    department TEXT,
    ward UUID,
    bed_number TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    discharge_date DATE,
    diagnosis TEXT,
    status TEXT DEFAULT 'admitted',
    nursing_notes TEXT DEFAULT '[]',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ipd_admissions_tenant_aid_key ON ipd_admissions(tenant_id, admission_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_tenant_id ON ipd_admissions(tenant_id);

-- 13. Wards
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    department TEXT,
    total_beds INTEGER DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wards_tenant_id ON wards(tenant_id);

-- 14. Beds
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY,
    ward TEXT,
    bed_number TEXT,               -- tenant-scoped, not globally unique
    type TEXT,
    status TEXT DEFAULT 'available',
    patient_id UUID,
    daily_rate NUMERIC DEFAULT 0,
    ward_id UUID REFERENCES wards(id),
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE UNIQUE INDEX IF NOT EXISTS beds_tenant_bnum_key ON beds(tenant_id, bed_number);
CREATE INDEX IF NOT EXISTS idx_beds_tenant_id ON beds(tenant_id);

-- 15. Nurse Notes
CREATE TABLE IF NOT EXISTS nurse_notes (
    id UUID PRIMARY KEY,
    admission_id UUID REFERENCES ipd_admissions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    nurse_id UUID,
    nurse_name TEXT,
    vitals TEXT DEFAULT '{}',
    observations TEXT,
    medications TEXT DEFAULT '[]',
    shift TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nurse_notes_tenant_id ON nurse_notes(tenant_id);

-- 16. Doctor Rounds
CREATE TABLE IF NOT EXISTS doctor_rounds (
    id UUID PRIMARY KEY,
    admission_id UUID REFERENCES ipd_admissions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    doctor_id UUID,
    doctor_name TEXT,
    observations TEXT,
    treatment_updates TEXT,
    procedure_orders TEXT DEFAULT '[]',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctor_rounds_tenant_id ON doctor_rounds(tenant_id);

-- 17. Account Entries
CREATE TABLE IF NOT EXISTS account_entries (
    id UUID PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    type TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    reference_id TEXT,
    department TEXT,
    status TEXT DEFAULT 'completed',
    user_id UUID,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_entries_tenant_id ON account_entries(tenant_id);

-- 18. Department Budgets
CREATE TABLE IF NOT EXISTS department_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL,
    budget_amount NUMERIC DEFAULT 0,
    period TEXT DEFAULT 'Monthly',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE UNIQUE INDEX IF NOT EXISTS department_budgets_tenant_dept_key ON department_budgets(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_dept_budgets_tenant_id ON department_budgets(tenant_id);

-- 19. Hospital Settings
-- MULTI-TENANT: each hospital has its OWN settings row keyed by tenant_id
CREATE TABLE IF NOT EXISTS hospital_settings (
    id SERIAL,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT DEFAULT 'Hospital',
    tagline TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    currency TEXT DEFAULT 'USD',
    tax_rate NUMERIC DEFAULT 10,
    logo TEXT,
    zaad TEXT,
    sahal TEXT,
    edahab TEXT,
    mycash TEXT,
    PRIMARY KEY (tenant_id)           -- one row per tenant, not one row globally
);
CREATE INDEX IF NOT EXISTS idx_hospital_settings_tenant_id ON hospital_settings(tenant_id);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    action TEXT,
    module TEXT,
    details TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);

-- 21. Insurance Companies
CREATE TABLE IF NOT EXISTS insurance_companies (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_tenant_id ON insurance_companies(tenant_id);

-- 22. Patient Insurance Policies
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    company_id UUID REFERENCES insurance_companies(id) ON DELETE CASCADE,
    company_name TEXT,
    policy_number TEXT,
    coverage_type TEXT,
    coverage_limit NUMERIC DEFAULT 0,
    balance_remaining NUMERIC DEFAULT 0,
    co_pay_percent NUMERIC DEFAULT 0,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pat_ins_policies_tenant_id ON patient_insurance_policies(tenant_id);

-- 23. Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY,
    claim_id TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    insurance_company TEXT,
    policy_number TEXT,
    invoice_id UUID,
    claim_amount NUMERIC DEFAULT 0,
    approved_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'submitted',
    policy_id UUID,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS insurance_claims_tenant_cid_key ON insurance_claims(tenant_id, claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant_id ON insurance_claims(tenant_id);

-- 24. Daily Operations
CREATE TABLE IF NOT EXISTS daily_operations (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    department TEXT,
    transaction_type TEXT NOT NULL,
    lab_test_id UUID REFERENCES lab_catalog(id) ON DELETE CASCADE,
    lab_test_name TEXT,
    amount NUMERIC DEFAULT 0,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    recorded_by TEXT,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_daily_operations_tenant_id ON daily_operations(tenant_id);

-- 25. Manual Daily Revenue (Spreadsheet-like)
CREATE TABLE IF NOT EXISTS manual_daily_revenue (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS manual_daily_revenue_tenant_date_dept_cat_key
    ON manual_daily_revenue(tenant_id, date, department, category);
CREATE INDEX IF NOT EXISTS idx_manual_daily_revenue_tenant_id ON manual_daily_revenue(tenant_id);

-- HMS License cache
CREATE TABLE IF NOT EXISTS hms_license (
    machine_id TEXT PRIMARY KEY,
    license_key TEXT,
    company_name TEXT,
    product_type TEXT DEFAULT 'HMS',
    start_date TEXT,
    expiry_date TEXT,
    status TEXT DEFAULT 'Active',
    is_trial INTEGER DEFAULT 0,
    tenant_id VARCHAR(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hms_license_tenant_id ON hms_license(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hms_license_key ON hms_license(license_key);

-- NOTE: No default admin seeded here.
-- Each hospital gets its own isolated admin created during license activation.
-- See routes/license.js → ensureTenantAdmin()
