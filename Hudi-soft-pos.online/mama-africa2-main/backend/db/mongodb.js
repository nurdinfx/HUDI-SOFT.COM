import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && uri.startsWith('MONGODB_URI=')) {
        uri = uri.replace('MONGODB_URI=', '');
    }
    
    if (uri) {
        // More robust obfuscation that doesn't destroy the protocol prefix
        const obfuscatedUri = uri.replace(/(\/\/.*:)(.*)(@)/, '$1****$3');
        console.log(`🔗 Attempting connection to: ${obfuscatedUri}`);
    }
    const conn = await mongoose.connect(uri, {
      bufferCommands: true,
      family: 4,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error Message: ${error.message}`);
    if (error.message.includes('querySrv') || error.message.includes('ENOTFOUND') || error.name === 'MongooseServerSelectionError') {
        console.log('\n🚨 RENDER DEPLOYMENT TIP: Render has DNS issues with mongodb+srv://.');
        console.log('💡 SOLUTION: Use a "Standard Connection String" (mongodb:// format) in your Render dashboard.');
        console.log('1. Go to MongoDB Atlas > Database > Connect > Drivers.');
        console.log('2. Choose "Node.js" version "2.2.12 or later".');
        console.log('3. Copy that connection string (starts with mongodb://) into Render MONGODB_URI.');
        console.log('4. Ensure "0.0.0.0/0" is whitelisted in Atlas Network Access.\n');
    }
    // We intentionally don't exit the process here so that Render deployment can succeed (bind to port)
    console.log('⚠️ Server continuing without initial database connection. Application may not function correctly until DB is reachable.');
    return false;
  }
};

export default connectDB;
