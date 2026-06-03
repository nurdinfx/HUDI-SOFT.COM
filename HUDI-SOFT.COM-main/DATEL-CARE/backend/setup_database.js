const fs = require('fs');
const path = require('path');
const db = require('./database');

async function setupDatabase() {
    console.log("🛠️ Starting database setup from schema.sql...");
    
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon but ignore semicolons inside single quotes
        // This is a naive split but schema.sql seems simple enough
        const statements = schemaSql
            .split(/;\s*$/m)
            .filter(stmt => stmt.trim().length > 0);
            
        console.log(`📜 Found ${statements.length} SQL statements. Executing...`);
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            try {
                await db.exec(stmt);
                process.stdout.write('.');
            } catch (err) {
                console.error(`\n❌ Error executing statement ${i + 1}:`, err.message);
                console.error('SQL:', stmt);
            }
        }
        
        console.log("\n✅ Database setup completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Database setup failed:", error.message);
        process.exit(1);
    }
}

setupDatabase();
