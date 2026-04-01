import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: true,
      family: 4,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('querySrv') || error.message.includes('ENOTFOUND')) {
        console.log('\n💡 TIP: Render has DNS issues with mongodb+srv://. Please use a "Standard Connection String" (mongodb:// format) in your Render dashboard environment variables.');
    }
    process.exit(1);
  }
};

export default connectDB;
