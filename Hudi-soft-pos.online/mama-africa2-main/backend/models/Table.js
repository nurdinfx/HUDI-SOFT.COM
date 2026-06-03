import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: String,
  tableNumber: String,
  name: String,
  capacity: Number,
  location: String,
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'cleaning'], default: 'available' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('Table', tableSchema);
