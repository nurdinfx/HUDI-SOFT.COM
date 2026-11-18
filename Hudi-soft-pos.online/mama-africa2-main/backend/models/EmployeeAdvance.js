import mongoose from 'mongoose';

const employeeAdvanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  amount: { type: Number, required: true },
  description: String,
  status: { type: String, enum: ['pending', 'deducted', 'paid'], default: 'pending' },
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('EmployeeAdvance', employeeAdvanceSchema);
