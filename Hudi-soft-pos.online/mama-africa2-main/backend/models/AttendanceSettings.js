import mongoose from 'mongoose';

const attendanceSettingsSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
  officeStartTime: { type: String, default: '08:00' },
  officeEndTime: { type: String, default: '17:00' },
  gracePeriod: { type: Number, default: 15 },
  lateThreshold: { type: Number, default: 30 },
  overtimeRules: {
    minHoursForOvertime: { type: Number, default: 8 },
    multiplier: { type: Number, default: 1.5 }
  },
  policies: {
    allowMultipleDevices: { type: Boolean, default: true },
    requireLocation: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.model('AttendanceSettings', attendanceSettingsSchema);
