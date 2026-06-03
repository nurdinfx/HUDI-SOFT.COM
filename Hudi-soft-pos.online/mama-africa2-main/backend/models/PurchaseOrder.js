import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  orderedQty: { type: Number, required: true },
  receivedQty: { type: Number, default: 0 },
  unitCost: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  status: { type: String, enum: ['pending', 'ordered', 'partially_received', 'received', 'cancelled'], default: 'pending' },
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expectedDelivery: Date,
  approvedAt: Date,
  notes: String,
  items: [purchaseOrderItemSchema]
}, { timestamps: true });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
