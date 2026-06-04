const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String }
}, { timestamps: true });

supplierSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);
