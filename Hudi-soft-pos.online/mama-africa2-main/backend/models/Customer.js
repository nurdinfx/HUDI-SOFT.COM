import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  accountType: { type: String, enum: ['debit', 'credit', 'standard'], default: 'standard' },
  balance: { type: Number, default: 0 }, // For debit users (deposit balance)
  creditLimit: { type: Number, default: 0 }, // For credit users
  creditUsed: { type: Number, default: 0 }, // Track credit usage
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

// Compound index to ensure unique phone per branch
customerSchema.index({ phone: 1, branch: 1 }, { unique: true, sparse: true });

export default mongoose.model('Customer', customerSchema);
