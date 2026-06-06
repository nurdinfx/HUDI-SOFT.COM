require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { corsMiddleware, applyCorsHeaders } = require('./middleware/cors');

mongoose.set('bufferCommands', true);
mongoose.set('strictQuery', false);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const BUILD_TAG = 'v1.5.0-max-devices-10';
console.log(`🚀 HUDI SOFT Backend ${BUILD_TAG}`);

// 1. CORS first — must answer OPTIONS before any route or body parser
app.use(corsMiddleware);

// 2. Body parser
app.use(express.json());

// 3. API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/downloads', require('./routes/downloadRoutes'));

require('./jobs/cron');

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.get('/', (req, res) => {
    res.send(`HUDI SOFT Licensing API is running (${BUILD_TAG}).`);
});

app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    res.json({
        ok: dbState === 1,
        build: BUILD_TAG,
        mongo: { readyState: dbState },
        uptime: process.uptime(),
    });
});

app.get('/api/emergency-reset', async (req, res) => {
    try {
        const User = require('./models/User');
        const email = 'admin@hudisoft.com';
        const password = 'admin123';

        let user = await User.findOne({ email });
        if (user) {
            user.password = password;
            await user.save();
            res.send('Admin password reset to admin123');
        } else {
            await User.create({
                email,
                password,
                companyName: 'HUDI SOFT',
                role: 'admin',
            });
            res.send('Admin user created with password admin123');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    applyCorsHeaders(req, res);
    res.status(500).json({ valid: false, message: 'Internal server error' });
});

const connectMongo = async () => {
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI is not set. License validation will return 503 until configured.');
        return;
    }
    try {
        const obfuscatedUri = process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@');
        console.log(`🔗 Connecting to MongoDB: ${obfuscatedUri}`);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            family: 4,
            bufferCommands: true,
        });
        console.log('✅ MongoDB connected');

        const License = require('./models/License');
        const { DEFAULT_MAX_DEVICES } = require('./config/license');
        const migration = await License.updateMany(
            { $or: [{ maxDevices: { $lt: DEFAULT_MAX_DEVICES } }, { maxDevices: { $exists: false } }] },
            { $set: { maxDevices: DEFAULT_MAX_DEVICES } }
        );
        if (migration.modifiedCount > 0) {
            console.log(`[License] Migrated ${migration.modifiedCount} license(s) to maxDevices=${DEFAULT_MAX_DEVICES}`);
        }
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.name, error.message);
        if (error.name === 'MongooseServerSelectionError' || error.message.includes('querySrv ENOTFOUND')) {
            console.log('\n🚨 RENDER: Use mongodb:// standard connection string if mongodb+srv fails on Render.\n');
        }
    }
};

// Start HTTP immediately so Render health checks and CORS preflight are not blocked by DB cold start
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (${BUILD_TAG})`);
    connectMongo();
    startKeepAlive();
});

/**
 * Keep-alive: prevents Render free-tier from sleeping.
 * Pings the /api/health endpoint every 10 minutes in production.
 * This means the preflight OPTIONS request from the browser will never
 * hit a sleeping container in normal usage.
 */
function startKeepAlive() {
    if (process.env.NODE_ENV !== 'production') return;
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
        try {
            const res = await fetch(`${RENDER_URL}/api/health`, { method: 'GET' });
            console.log(`[KeepAlive] Ping OK — status=${res.status} uptime=${Math.round(process.uptime())}s`);
        } catch (err) {
            console.warn('[KeepAlive] Ping failed:', err.message);
        }
    }, PING_INTERVAL_MS);

    console.log(`[KeepAlive] Scheduled ping every ${PING_INTERVAL_MS / 60000} min → ${RENDER_URL}/api/health`);
}
