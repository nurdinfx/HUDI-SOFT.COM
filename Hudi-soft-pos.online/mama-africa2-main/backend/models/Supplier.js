import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: String,
  contact: mongoose.Schema.Types.Mixed,
  phone: String,
  email: String,
  address: String,
  paymentTerms: String,
  notes: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('Supplier', supplierSchema);
