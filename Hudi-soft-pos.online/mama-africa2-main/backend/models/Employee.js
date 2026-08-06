import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, required: true },
  phone: String,
  email: String,
  salary: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  joinDate: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceShift' },
  photoUrl: { type: String, default: '' },
  department: { type: String, default: 'General' },
  employeeId: { type: String, unique: true, sparse: true },
  fingerprint: {
    template: { type: String, default: null },
    enrolledAt: { type: Date, default: null },
    enrollmentStatus: { type: String, enum: ['Enrolled', 'Not Enrolled'], default: 'Not Enrolled' },
    lastVerifiedAt: { type: Date, default: null },
    deviceName: { type: String, default: 'USB Biometric Scanner' }
  }
}, { timestamps: true });

// Ensure unique phone number per employee per branch
employeeSchema.index({ phone: 1, branch: 1 }, { unique: true, sparse: true });

export default mongoose.model('Employee', employeeSchema);
