import mongoose from 'mongoose';

const housekeepingTaskSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  taskType: { type: String, enum: ['cleaning', 'inspection', 'maintenance'], default: 'cleaning' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('HousekeepingTask', housekeepingTaskSchema);
