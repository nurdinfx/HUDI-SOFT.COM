require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { corsMiddleware } = require('./middleware/cors');
const { pool } = require('./db/pool');
const { runMigrations } = require('./db/migrate');

const BUILD_TAG = 'v1.0.0';
console.log(`\n🏥 Datel Clinic System — Backend API ${BUILD_TAG}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

const app = express();
const PORT = process.env.PORT || 6000;

// ── Security ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(corsMiddleware);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static files ──────────────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/index'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  product: 'Datel Clinic System',
  version: BUILD_TAG,
  status: 'running',
}));

app.get('/api/health', async (req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    dbError = err.message;
  }
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    dbError,
    product: 'Datel Clinic System',
    build: BUILD_TAG,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Admin Purge All Transactions (Clean slate $0.00, keeps clinics & users) ──
app.all('/api/admin-purge-all-transactions', async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM pharmacy_sale_items;
      DELETE FROM pharmacy_sales;
      DELETE FROM invoice_items;
      DELETE FROM invoices;
      DELETE FROM lab_results;
      DELETE FROM lab_requests;
      DELETE FROM prescriptions;
      DELETE FROM consultation_notes;
      DELETE FROM appointments;
      DELETE FROM dental_images;
      DELETE FROM dental_lab_orders;
      DELETE FROM treatment_plan_items;
      DELETE FROM treatment_plans;
      DELETE FROM dental_charts;
      DELETE FROM doctor_commissions;
      DELETE FROM notifications;
      DELETE FROM patients;
    `);
    res.json({
      success: true,
      message: 'Dhammaan xogta bukaannada, treatment plans-ka, iyo biilasha waa la wada nadiifiyay ($0.00). Akoonnada iyo shatiyadu waa sidiisii.'
    });
  } catch (err) {
    console.error('[Admin Purge] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Cron jobs ─────────────────────────────────────────────────────────────────
require('./jobs/subscriptionSync');

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  startKeepAlive();
  
  // Verify database connection & run initial migrations
  try {
    await runMigrations();
  } catch (err) {
    console.error('⚠️ Startup migration check error:', err.message);
  }
});

function startKeepAlive() {
  if (process.env.NODE_ENV !== 'production') return;
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      await fetch(`${url}/api/health`);
      console.log(`[KeepAlive] Ping OK — uptime=${Math.round(process.uptime())}s`);
    } catch (e) {
      console.warn('[KeepAlive] Ping failed:', e.message);
    }
  }, 10 * 60 * 1000);
  console.log(`[KeepAlive] Scheduled every 10min → ${url}`);
}
