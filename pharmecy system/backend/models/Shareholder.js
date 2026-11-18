const mongoose = require('mongoose');

const shareholderSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Must be linked to a User with 'Shareholder' role
  percentageOwnership: { type: Number, required: true },
  totalDividendsPaid: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Shareholder', shareholderSchema);
