/**
 * migrate_tables.js
 * Ensures all HR, Credit, and missing tables exist in PostgreSQL Supabase on startup.
 */
const db = require('./database');

module.exports = async function migrateTables() {
  console.log('🔄 [Migration] Checking database schemas and table existence...');
  try {
    // 1. Employees table
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY,
        employee_id TEXT UNIQUE,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        position TEXT,
        department TEXT,
        base_salary NUMERIC DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        status TEXT DEFAULT 'active',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Employee Expenses
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_expenses (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        type TEXT DEFAULT 'advance',
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'pending',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Employee Ledger
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_ledger (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        type TEXT,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Employee Payroll
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_payroll (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        month_year TEXT,
        base_salary NUMERIC DEFAULT 0,
        bonuses NUMERIC DEFAULT 0,
        deductions NUMERIC DEFAULT 0,
        net_salary NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'processed',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Credit Customers
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_customers (
        id UUID PRIMARY KEY,
        customer_id TEXT UNIQUE,
        full_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        patient_id UUID,
        credit_limit NUMERIC DEFAULT 1000,
        total_debt NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'active',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Credit Ledger
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        type TEXT,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Credit Transactions
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        invoice_id UUID,
        amount NUMERIC DEFAULT 0,
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'unpaid',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Credit Payments
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_payments (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES credit_customers(id) ON DELETE CASCADE,
        amount NUMERIC DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        date DATE DEFAULT CURRENT_DATE,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ [Migration] All HR and Credit tables verified/created successfully.');
  } catch (err) {
    console.error('❌ [Migration Error]:', err.message);
  }
};
