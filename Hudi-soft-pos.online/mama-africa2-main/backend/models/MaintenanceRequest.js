import mongoose from 'mongoose';

const maintenanceRequestSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'open' },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  outOfOrder: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
