import mongoose from 'mongoose';

const attendanceDeviceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  credentialId: { type: String, required: true, unique: true },
  publicKey: { type: mongoose.Schema.Types.Mixed, required: true }, // Store JWK credentials
  counter: { type: Number, default: 0 },
  deviceName: { type: String, default: 'Unknown Device' },
  browser: { type: String },
  os: { type: String }
}, { timestamps: true });

export default mongoose.model('AttendanceDevice', attendanceDeviceSchema);
