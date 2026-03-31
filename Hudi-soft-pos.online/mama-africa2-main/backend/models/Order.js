import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  notes: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery', 'room-service'], default: 'dine-in' },
  status: { type: String, enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'], default: 'pending' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: String,
  customerName: String,
  customerPhone: String,
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mobile', 'credit'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded'], default: 'pending' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  kitchenStatus: { type: String, default: 'pending' },
  kitchenNotes: String,
  items: [orderItemSchema]
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
