import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: String, required: true }, // e.g. "08:00"
  endTime: { type: String, required: true },   // e.g. "17:00"
  gracePeriod: { type: Number, default: 15 },  // in minutes
  overtimeRules: {
    minHours: { type: Number, default: 8 },
    multiplier: { type: Number, default: 1.5 }
  },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('AttendanceShift', shiftSchema);
