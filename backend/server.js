require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1); // Enable trusting proxy to get correct IP, protocol and host from Render/Vercel
const PORT = process.env.PORT || 5000;

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
mongoose.set('bufferCommands', false); // Disable buffering to avoid long timeouts when not connected

mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Reduced timeout for faster feedback
        family: 4 // Force IPv4 to avoid common Atlas connection issues
    })
    .then(() => {
        console.log('Successfully connected to MongoDB Atlas');
    })
    .catch((error) => {
        console.error('MongoDB connection error details:');
        console.error('- Name:', error.name);
        console.error('- Message:', error.message);
        if (error.reason) {
            console.error('- Reason:', JSON.stringify(error.reason, null, 2));
        }
    });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
