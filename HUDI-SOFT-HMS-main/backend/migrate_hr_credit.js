const db = require('./database');
const { addColumnIfMissing, columnExists, tableExists } = require('./utils/schema');

async function migrate_hr_credit() {
    console.log("🚀 Starting Employee Credit Migration...");
    try {
        const state = await addColumnIfMissing('employees', 'outstanding_balance', 'DECIMAL(12, 2) DEFAULT 0.00');
        if (state === 'added') {
            console.log("✅ Added `outstanding_balance` column to `employees`");
        } else if (state === 'exists') {
            console.log("ℹ️ `outstanding_balance` column already exists.");
        } else if (state === 'not_owner') {
            console.log("ℹ️ Skipping `outstanding_balance` schema change: current DB user is not the `employees` table owner.");
        } else {
            console.log("ℹ️ Skipping Employee Credit Migration: `employees` table does not exist.");
            return;
        }

        const hasEmployeesTable = await tableExists('employees');
        const hasExpensesTable = await tableExists('employee_expenses');
        const hasOutstandingBalance = hasEmployeesTable && await columnExists('employees', 'outstanding_balance');

        if (!hasExpensesTable || !hasOutstandingBalance) {
            console.log("ℹ️ Skipping balance recalculation until the required HR tables/columns are available.");
            return;
        }

        // Backfill outstanding_balance for existing employees based on their pending employee_expenses (advances)
        console.log("🔄 Recalculating outstanding balances from pending advances...");
        const employees = await db.prepare("SELECT id FROM employees").all();
        
        let updatedCount = 0;
        for (const emp of employees) {
            const deductions = await db.prepare(`
                SELECT SUM(amount) as total 
                FROM employee_expenses 
                WHERE employee_id = ? AND status = 'pending'
            `).get(emp.id);
            
            const total = parseFloat(deductions?.total || 0);
            if (total > 0) {
                await db.prepare("UPDATE employees SET outstanding_balance = ? WHERE id = ?").run(total, emp.id);
                updatedCount++;
            }
        }
        
        console.log(`✅ Updated balances for ${updatedCount} employees with pending advances.`);
        console.log("🎉 Employee Credit Migration completed successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        throw err;
    }
}

module.exports = migrate_hr_credit;
if (require.main === module) {
    migrate_hr_credit();
}
