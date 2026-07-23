import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  action: { type: String, required: true }, // e.g. "Passkey Added", "Attendance Adjusted", "Shift Assigned"
  performedBy: { type: String, required: true }, // Username or Employee Name
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  details: { type: String },
  ip: { type: String }
}, { timestamps: true });

export default mongoose.model('AttendanceAuditLog', auditLogSchema);
