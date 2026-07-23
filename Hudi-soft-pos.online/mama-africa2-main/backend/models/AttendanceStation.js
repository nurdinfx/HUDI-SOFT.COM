import mongoose from 'mongoose';

const attendanceStationSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Main Entrance Lobby"
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  token: { type: String, required: true, unique: true }, // secure unique QR token
  locationType: { type: String, enum: ['Entrance', 'Reception', 'Office', 'Warehouse', 'Branch Location'], default: 'Entrance' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('AttendanceStation', attendanceStationSchema);
