import mongoose from 'mongoose';

const attendanceLogSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
  totalHours: { type: Number, default: 0 },
  status: { type: String, enum: ['Present', 'Late', 'Absent', 'Half Day', 'Overtime', 'Early Departure', 'Break'], default: 'Present' },
  authMethod: { type: String, enum: ['QR Code', 'Fingerprint', 'Manual'], default: 'QR Code' },
  attendanceType: { type: String, enum: ['Check In', 'Check Out', 'Break Start', 'Break End', 'Overtime'], default: 'Check In' },
  deviceInfo: {
    browser: { type: String },
    os: { type: String },
    ip: { type: String },
    userAgent: { type: String }
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  isBiometricVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure an employee has only one log entry per date
attendanceLogSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('AttendanceLog', attendanceLogSchema);
