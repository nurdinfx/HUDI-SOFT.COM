import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: String,
  tableNumber: String,
  name: String,
  capacity: Number,
  location: String,
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'cleaning'], default: 'available' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

  // QR Code Ordering fields
  qrToken: { type: String, unique: true, sparse: true }, // unique token embedded in QR URL
  qrEnabled: { type: Boolean, default: false },           // admin can disable QR per table
  qrGeneratedAt: { type: Date },
  qrScanCount: { type: Number, default: 0 },              // analytics: how many times QR was scanned
}, { timestamps: true });

export default mongoose.model('Table', tableSchema);
