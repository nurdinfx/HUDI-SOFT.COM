import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (uri) {
        const obfuscatedUri = uri.replace(/:([^@]+)@/, ':****@');
        console.log(`🔗 Attempting connection to: ${obfuscatedUri}`);
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: true,
      family: 4,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error Message: ${error.message}`);
    if (error.message.includes('querySrv') || error.message.includes('ENOTFOUND') || error.name === 'MongooseServerSelectionError') {
        console.log('\n🚨 RENDER DEPLOYMENT TIP: Render has DNS issues with mongodb+srv://.');
        console.log('💡 SOLUTION: Use a "Standard Connection String" (mongodb:// format) in your Render dashboard.');
        console.log('1. Go to MongoDB Atlas > Database > Connect > Drivers.');
        console.log('2. Choose "Standard Connection String" for older Node.js drivers.');
        console.log('3. Update MONGODB_URI in Render dashboard.');
        console.log('4. Ensure "0.0.0.0/0" is whitelisted in Atlas Network Access.\n');
    }
    process.exit(1);
  }
};

export default connectDB;
