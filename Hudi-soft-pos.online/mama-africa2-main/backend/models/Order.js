import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: String,
  productName: String,
  name: String,
  itemName: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  notes: String,
  specialInstructions: String,
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery', 'room-service', 'sale'], default: 'dine-in' },
  orderSource: { type: String, enum: ['pos', 'qr', 'waiter'], default: 'pos' }, // NEW: where the order came from
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: String,
  customerName: String,
  customerPhone: String,
  customerSessionId: String, // NEW: anonymous session for QR customers
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'credit', 'zaad', 'sahal', 'edahab', 'mycash', 'evc_plus', 'qr_payment', 'pay_later', 'room'],
    default: 'cash'
  },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded'], default: 'pending' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookedRoom: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  kitchenStatus: { type: String, default: 'pending' },
  kitchenNotes: String,
  specialInstructions: String,       // NEW: overall order notes from customer
  estimatedPrepTime: Number,          // NEW: minutes estimated for preparation
  waiterRequested: { type: Boolean, default: false }, // NEW: customer called waiter
  billRequested: { type: Boolean, default: false },   // NEW: customer requested bill
  items: [orderItemSchema]
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);

