require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is not defined in .env file');
    process.exit(1);
}

console.log('🔍 Attempting to connect to MongoDB...');
console.log(`📡 URI: ${MONGODB_URI.substring(0, 20)}...`);

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    family: 4
})
.then(() => {
    console.log('✅ Connection Successful!');
    console.log('---------------------------------------------');
    console.log('Your database connection is working correctly.');
    process.exit(0);
})
.catch((err) => {
    console.error('❌ Connection Failed!');
    console.error('---------------------------------------------');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    
    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
        console.log('\n💡 TIP: It looks like a DNS issue. Try switching to a standard connection string (mongodb:// instead of mongodb+srv://) or check your Network Access whitelist in MongoDB Atlas.');
    } else if (err.message.includes('timeout')) {
        console.log('\n💡 TIP: The connection timed out. This is usually due to a firewall or your IP not being whitelisted in MongoDB Atlas.');
    }
    
    process.exit(1);
});
