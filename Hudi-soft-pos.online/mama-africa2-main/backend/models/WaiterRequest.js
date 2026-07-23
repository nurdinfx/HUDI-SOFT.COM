// backend/models/WaiterRequest.js
import mongoose from 'mongoose';

const waiterRequestSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String, required: true },
  tableName: String,
  type: {
    type: String,
    enum: ['waiter_call', 'bill_request', 'order_assistance'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved'],
    default: 'pending'
  },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerSessionId: String,
  notes: String,
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

export default mongoose.model('WaiterRequest', waiterRequestSchema);
