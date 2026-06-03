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

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-License-Key'],
    optionsSuccessStatus: 200
}));

// 2. Other Middlewares
app.use(express.json());

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

// EMERGENCY RESET (Remove after use)
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
                role: 'admin'
            });
            res.send('Admin user created with password admin123');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
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
