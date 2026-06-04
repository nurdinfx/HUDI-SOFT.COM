const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');

// BUILD: 2026-06-04-v2 — port opens before DB, no process.exit anywhere
const BUILD_ID = '2026-06-04-v2';
console.log(`🚀 HUDI HMS Backend ${BUILD_ID} starting...`);

const app = express();
const PORT = process.env.PORT || 4000;

// ─── 1. CORS ──────────────────────────────────────────────────────────────────
// Must be the first middleware — answers OPTIONS preflight before anything else.
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://hudi-soft-hms.vercel.app',
        'https://hudi-soft-com-sz9e.vercel.app',
        'https://hudi-soft-com.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'http://localhost:5173',
        'https://hudi-soft-hms.onrender.com',
    ];

    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
    }

    const isAllowed = origin && (
        allowedOrigins.includes(origin.replace(/\/$/, '')) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
    );

    if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-License-Key');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

// ─── 2. Body parsers ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── 3. Request logging ───────────────────────────────────────────────────────
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || 'none'}`);
    next();
});

// ─── 4. Health check — NO DB dependency, answers immediately ─────────────────
// This must be registered before routes that require DB so Render's health
// check always gets a 200, even during DB cold start or migration.
let dbReady = false;
let dbError = null;

app.get('/api/health', (req, res) => {
    res.json({
        status: dbReady ? 'ok' : 'starting',
        db: dbReady ? 'connected' : (dbError ? `error: ${dbError}` : 'connecting'),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.1.0',
    });
});

// ─── 5. Routes ────────────────────────────────────────────────────────────────
const licenseCheck = require('./middleware/licenseCheck');

app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/push', require('./routes/push'));
app.use('/api/pos',              licenseCheck, require('./routes/pos'));
app.use('/api/patients',         licenseCheck, require('./routes/patients'));
app.use('/api/doctors',          licenseCheck, require('./routes/doctors'));
app.use('/api/appointments',     licenseCheck, require('./routes/appointments'));
app.use('/api/pharmacy',         licenseCheck, require('./routes/pharmacy'));
app.use('/api/laboratory',       licenseCheck, require('./routes/laboratory'));
app.use('/api/billing',          licenseCheck, require('./routes/billing'));
app.use('/api/opd',              licenseCheck, require('./routes/opd'));
app.use('/api/ipd',              licenseCheck, require('./routes/ipd'));
app.use('/api/insurance',        licenseCheck, require('./routes/insurance'));
app.use('/api/users',            licenseCheck, require('./routes/users'));
app.use('/api/inventory',        licenseCheck, require('./routes/inventory'));
app.use('/api/accounts',         licenseCheck, require('./routes/accounts'));
app.use('/api/payments',         licenseCheck, require('./routes/payments'));
app.use('/api/audit',            licenseCheck, require('./routes/audit'));
app.use('/api/reports',          licenseCheck, require('./routes/reports'));
app.use('/api/settings',         licenseCheck, require('./routes/settings'));
app.use('/api/dashboard',        licenseCheck, require('./routes/dashboard'));
app.use('/api/credit',           licenseCheck, require('./routes/credit'));
app.use('/api/hr',               licenseCheck, require('./routes/hr'));
app.use('/api/daily-operations', licenseCheck, require('./routes/daily_operations'));
app.use('/api/revenue-analytics',licenseCheck, require('./routes/revenue_analytics'));
app.use('/api/procedures',       licenseCheck, require('./routes/procedures'));
app.use('/api/vitals',           licenseCheck, require('./routes/vitals'));

// ─── 6. 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── 7. Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    const origin = req.headers.origin;
    if (origin && (origin.includes('vercel.app') || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        path: req.originalUrl,
    });
});

// ─── 8. START HTTP SERVER FIRST ───────────────────────────────────────────────
// Render requires the port to be open within ~30 seconds of startup.
// We open the port immediately, THEN connect to the database.
// This prevents the "No open ports detected" crash loop.
app.listen(PORT, () => {
    console.log(`\n✅ BUILD ${BUILD_ID} — HTTP port ${PORT} is OPEN`);
    console.log(`🏥 Hospital Management API ready`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   DB connects AFTER this line — port is already open`);
    initDatabase();
});

// ─── 9. DB init + migrations (non-blocking) ───────────────────────────────────
async function runMigrations() {
    const migrations = [
        './migrate_revenue_analytics',
        './migrate_multi_test',
        './migrate_purchase_hub',
        './migrate_push_subscriptions',
        './migrate_procedures',
        './migrate_pharmacy_accounts',
        './migrate_vitals',
    ];

    for (const m of migrations) {
        try {
            await require(m)();
        } catch (err) {
            // Log but never crash — a failed migration should not take the
            // entire API offline. That table simply won't exist until fixed.
            console.error(`⚠️ Migration warning [${m}]:`, err.message);
        }
    }
}

async function initDatabase() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in environment variables.');
        console.error('   Go to Render dashboard → Environment → Add DATABASE_URL');
        dbError = 'DATABASE_URL missing';
        return;
    }

    try {
        // Verify connection with a simple query
        const dbModule = require('./database');
        await dbModule.query('SELECT 1');
        console.log('✅ Database connected');
        dbReady = true;

        console.log('📦 Running database migrations...');
        await runMigrations();
        console.log('✅ All migrations complete');
    } catch (err) {
        dbError = err.message;
        console.error('❌ Database connection failed:', err.message);
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('  RENDER FIX: Set DATABASE_URL in your service env vars.');
        console.error('  Get the connection string from your Supabase project:');
        console.error('  Supabase → Settings → Database → Connection String');
        console.error('  Use the "Transaction pooler" string (port 6543).');
        console.error('  It looks like:');
        console.error('  postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
        console.error('  API is still running — license validation, health check work.');
        console.error('  DB-dependent routes will return 503 until DATABASE_URL is set.');
    }
}

module.exports = app;
