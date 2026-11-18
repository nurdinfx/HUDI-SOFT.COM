const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // Null for Global Super Admin actions
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'CREATE_BRANCH', 'DELETE_SALE', 'LOGIN'
  resource: { type: String }, // e.g., 'Medicine', 'Sale'
  details: { type: mongoose.Schema.Types.Mixed }, // JSON of what changed
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
