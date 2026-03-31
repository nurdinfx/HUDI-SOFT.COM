import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

// Compound index to ensure unique phone per branch
customerSchema.index({ phone: 1, branch: 1 }, { unique: true, sparse: true });

export default mongoose.model('Customer', customerSchema);
