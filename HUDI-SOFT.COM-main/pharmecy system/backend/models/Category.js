const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

categorySchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
