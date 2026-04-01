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
console.log('🚀 HUDI SOFT Backend v1.3.0 (Refreshed Deployment)');

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
        // Log obfuscated URI to verify if the env var was updated correctly
        if (process.env.MONGO_URI) {
            const obfuscatedUri = process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@');
            console.log(`🔗 Target URI: ${obfuscatedUri}`);
        }
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
        console.error('❌ MongoDB connection error details:');
        console.error('- Name:', error.name);
        console.error('- Message:', error.message);
        
        if (error.name === 'MongooseServerSelectionError' || error.message.includes('querySrv ENOTFOUND')) {
            console.log('\n🚨 RENDER DEPLOYMENT TIP: Render has DNS issues with mongodb+srv://.');
            console.log('💡 SOLUTION: Use a "Standard Connection String" (mongodb:// format) in your Render dashboard.');
            console.log('1. Go to MongoDB Atlas > Connect > Drivers.');
            console.log('2. Copy the "Standard Connection String" (the older format).');
            console.log('3. Update MONGO_URI in Render dashboard.');
            console.log('4. Ensure "0.0.0.0/0" is whitelisted in Atlas Network Access.\n');
        }

        process.exit(1);
    }
};

startServer();
