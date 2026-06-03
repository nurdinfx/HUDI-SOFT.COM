const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

branchSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
