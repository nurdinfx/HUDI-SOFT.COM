const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

const { AsyncLocalStorage } = require('async_hooks');
global.tenantStorage = new AsyncLocalStorage();

// ─── DB Module (moved to top to fix ReferenceError) ──────────────
const dbModule = require('./database');

// ─── CORS ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://hudi-soft-hms.vercel.app',
        'https://daryeel-hms-com.vercel.app',
        'https://hudi-soft-hm-gargaar.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://hudi-soft-com.onrender.com',
        'capacitor://localhost',      // Capacitor Android/iOS
        'http://localhost',            // Capacitor fallback
        'ionic://localhost',           // Ionic fallback
    ];
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
    }
    const isAllowed = !origin || (
        allowedOrigins.includes(origin.replace(/\/$/, '')) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://')
    );
    if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Machine-ID, X-Machine-Id, X-Tenant-ID, X-Tenant-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
});

// ─── Body Parsing ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Tenant Context Propagation ───────────────────────────────────
app.use((req, res, next) => {
    let tenantId = '00000000-0000-0000-0000-000000000000';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.tenantId) {
                tenantId = decoded.tenantId;
            }
        } catch (e) {
            // Ignore signature/expiry errors, authentication middleware will handle this later
        }
    }
    
    if (tenantId === '00000000-0000-0000-0000-000000000000' && req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
    }

    global.tenantStorage.run(tenantId, () => {
        next();
    });
});

// ─── Request Logging ──────────────────────────────────────────────
app.use((req, res, next) => {
    const origin = req.headers.origin || 'No Origin';
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} | Origin: ${origin}`);
    next();
});

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.1.0-fix-test-2',
        dbUrlSet: !!process.env.DATABASE_URL,
        jwtSecretSet: !!process.env.JWT_SECRET
    });
});

// ─── Database Diagnostics ─────────────────────────────────────────
app.get('/api/db-test', async (req, res) => {
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return res.status(500).json({ status: 'error', message: 'DATABASE_URL environment variable is MISSING on this project. Please add it in Settings → Environment Variables.' });
    }
    dbUrl = dbUrl.trim();
    if (dbUrl.startsWith('DATABASE_URL=')) {
        dbUrl = dbUrl.substring(13).trim();
    }
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || 
        (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
        dbUrl = dbUrl.substring(1, dbUrl.length - 1).trim();
    }
    try {
        const parsed = new URL(dbUrl);
        const dbInfo = {
            host: parsed.hostname,
            database: parsed.pathname.split('/')[1],
            port: parsed.port || '5432',
            user: parsed.username
        };
        const startTime = Date.now();
        await dbModule.query("SELECT 1;");
        return res.json({ status: 'ok', message: 'Database connection successful ✅', info: dbInfo, durationMs: Date.now() - startTime });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: `Database connection failed: ${err.message}`, dbUrlProvided: !!dbUrl });
    }
});

// ─── License Enforcer Middleware ─────────────────────────────────
app.use(require('./middleware/licenseEnforcer'));

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/license', require('./routes/license'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/push', require('./routes/push'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/pharmacy/purchase', require('./routes/pharmacy_purchase'));
app.use('/api/laboratory', require('./routes/laboratory'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/opd', require('./routes/opd'));
app.use('/api/ipd', require('./routes/ipd'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/users', require('./routes/users'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/daily-operations', require('./routes/daily_operations'));
app.use('/api/revenue-analytics', require('./routes/revenue_analytics'));
app.use('/api/procedures', require('./routes/procedures'));
app.use('/api/vitals', require('./routes/vitals'));

// ─── Startup: Migrations ──────────────────────────────────────────
dbModule.promise.then(async () => {
    console.log('📦 Running Database Migrations...');
    try {
        // Auto-initialize schema if fresh database
        try {
            await dbModule.query("SELECT 1 FROM users LIMIT 1;");
            console.log('✅ Database tables verified');
        } catch (dbErr) {
            console.log('⚠️ users table missing – initializing schema...');
            const fs = require('fs');
            const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
            await dbModule.exec(schemaSql);
            console.log('✅ Schema initialized!');
        }

        // Auto-initialize HR schema if missing
        try {
            await dbModule.query("SELECT 1 FROM employees LIMIT 1;");
            console.log('✅ HR tables verified');
        } catch (hrErr) {
            console.log('⚠️ employees table missing – initializing HR schema...');
            const fs = require('fs');
            const hrSql = fs.readFileSync(path.join(__dirname, 'migrations', '20260314_hr_module.sql'), 'utf8');
            await dbModule.exec(hrSql);
            console.log('✅ HR Schema initialized!');
        }

        await require('./migrate_revenue_analytics')();
        await require('./migrate_multi_test')();
        await require('./migrate_purchase_hub')();
        await require('./migrate_push_subscriptions')();
        await require('./migrate_procedures')();
        await require('./migrate_pharmacy_accounts')();
        await require('./migrate_vitals')();
        await require('./migrate_hr_credit')();
        await require('./migrate_credit')();
        await require('./migrate_purchase_payment')();
        await require('./migrate_returns_v2')();
        await require('./migrate_hms_license')();
        await require('./migrate_tenant_isolation')();

        // ── Auto-seed default admin on fresh deployment ──────────────────
        // NOTE: This only seeds the DEFAULT tenant (legacy/no-activation mode).
        // Real hospital tenants get their own isolated admin via license activation.
        try {
            const bcrypt = require('bcryptjs');
            const { v4: uuidv4 } = require('uuid');
            const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
            
            // Only seed default admin if NONE exist in the default tenant
            const adminCheck = await dbModule.queryBypassRLS(
                "SELECT id FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
                [DEFAULT_TENANT]
            );
            
            if (!adminCheck.rows || adminCheck.rows.length === 0) {
                const adminId = uuidv4();
                const hashedPw = bcrypt.hashSync('admin123', 10);
                await dbModule.queryBypassRLS(
                    `INSERT INTO users (id, name, email, password_hash, role, is_active, tenant_id, created_at)
                     VALUES ($1, 'System Admin', 'admin@hms.local', $2, 'admin', 1, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (id) DO NOTHING`,
                    [adminId, hashedPw, DEFAULT_TENANT]
                );
                console.log('✅ Default admin seeded: admin@hms.local / admin123 (default tenant only)');
            } else {
                console.log('✅ Default tenant admin already exists');
            }

            // Ensure default hospital settings for legacy tenant
            await dbModule.queryBypassRLS(
                `INSERT INTO hospital_settings (tenant_id, name, tagline, currency, tax_rate)
                 VALUES ($1, 'Hudi Hospital', 'Care with Excellence', 'USD', 10)
                 ON CONFLICT (tenant_id) DO NOTHING`,
                [DEFAULT_TENANT]
            ).catch((e) => {
                // Non-fatal — hospital_settings may be keyed differently on older schemas
                console.warn('⚠️ hospital_settings seed (non-fatal):', e.message.substring(0, 80));
            });
        } catch (seedErr) {
            console.warn('⚠️ Admin seed warning (non-fatal):', seedErr.message);
        }
    } catch (err) {
        console.error('⚠️ Migration warning:', err.message);
    }
    app.listen(PORT, () => {
        console.log(`\n🏥 Hospital Management API ready at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    app.listen(PORT, () => {
        console.log(`\n⚠️ API running in ERROR mode (No DB) at http://localhost:${PORT}`);
    });
});

// ─── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Error Handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    const origin = req.headers.origin;
    if (origin && (origin.includes('vercel.app') || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({ error: 'Internal server error', message: err.message, path: req.originalUrl });
});

module.exports = app;
