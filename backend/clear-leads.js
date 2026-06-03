require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is not defined in .env file');
    process.exit(1);
}

const clearLeads = async () => {
    try {
        console.log('🔍 Connecting to MongoDB to clear leads...');
        await mongoose.connect(MONGODB_URI);
        
        const count = await Lead.countDocuments();
        console.log(`📊 Found ${count} leads in the system.`);
        
        if (count > 0) {
            await Lead.deleteMany({});
            console.log('✅ Successfully cleared all leads from the system.');
        } else {
            console.log('ℹ️ No leads found to clear.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to clear leads:', error.message);
        process.exit(1);
    }
};

clearLeads();
