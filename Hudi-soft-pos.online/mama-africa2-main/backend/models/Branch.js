import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  branchCode: { type: String, unique: true },
  address: String,
  phone: String,
  email: String,
  settings: { type: Map, of: mongoose.Schema.Types.Mixed },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Branch', branchSchema);
