require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Global Mongoose Configuration (Set these BEFORE requiring any models)
mongoose.set('bufferCommands', true); 
mongoose.set('strictQuery', false);

const app = express();
app.set('trust proxy', 1); // Enable trusting proxy to get correct IP, protocol and host from Render/Vercel
const PORT = process.env.PORT || 5000;
console.log('🚀 HUDI SOFT Backend v1.1.0 (Refreshed Deployment)');

// Middleware
app.use(express.json());

// Robust CORS for production
app.use(cors({
    origin: function (origin, callback) {
        // Reflect origin to handle any Vercel subdomains (preview/production)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/downloads', require('./routes/downloadRoutes'));

// Initialize Cron Jobs
require('./jobs/cron');

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Base Route
app.get('/', (req, res) => {
    res.send('HUDI SOFT Licensing API is running.');
});

// Database Connection
const startServer = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, 
            family: 4,
            bufferCommands: true 
        });
        console.log('Successfully connected to MongoDB Atlas');
        console.log('--- MONGOOSE BUFFERING SYSTEM V2 ACTIVE ---');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('MongoDB connection error details:');
        console.error('- Name:', error.name);
        console.error('- Message:', error.message);
        if (error.reason) {
            console.error('- Reason:', JSON.stringify(error.reason, null, 2));
        }
        // In some environments (like serverless), you might not want to exit. 
        // But for a persistent server, failing to connect to the DB on startup is usually a fatal error.
        process.exit(1);
    }
};

startServer();
