import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  licenseKey: { type: String, required: true, unique: true },
  deviceId: { type: String, unique: true },
  startDate: Date,
  expiryDate: Date,
  status: { type: String, enum: ['active', 'expired', 'suspended', 'trial'], default: 'trial' },
  lastCheck: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('License', licenseSchema);
