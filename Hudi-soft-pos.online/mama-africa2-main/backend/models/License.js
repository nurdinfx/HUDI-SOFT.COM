import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  licenseKey: { type: String, required: true, unique: true },
  deviceId: { type: String }, // Legacy field — fallback to latest device
  deviceIds: [String], // Array field to support multi-device activation simultaneously
  startDate: Date,
  expiryDate: Date,
  status: { type: String, enum: ['active', 'expired', 'suspended', 'trial'], default: 'trial' },
  lastCheck: { type: Date, default: Date.now }
}, { timestamps: true });

// Drop the old unique index on deviceId if it exists (migration for existing deployments)
licenseSchema.post('init', () => {});
mongoose.connection.on('connected', async () => {
  try {
    const col = mongoose.connection.collection('licenses');
    await col.dropIndex('deviceId_1');
    console.log('[License] Dropped old unique deviceId_1 index');
  } catch (e) {
    // Index doesn't exist or already dropped — safe to ignore
  }
});

export default mongoose.model('License', licenseSchema);
