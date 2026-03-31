import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

// Ensure unique key per branch
settingsSchema.index({ key: 1, branch: 1 }, { unique: true });

export default mongoose.model('Settings', settingsSchema);
