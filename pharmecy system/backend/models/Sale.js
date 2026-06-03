const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Selling price at the time of sale
    total: { type: Number, required: true }
  }],
  subTotal: { type: Number, required: true },
  vatAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Zaad', 'E-Dahab', 'Sahal', 'Bank'],
    required: true
  },
  receiptNumber: { type: String, required: true },
  customerName: { type: String }, // Optional
  customerPhone: { type: String } // Optional
}, { timestamps: true });

saleSchema.index({ tenant: 1, receiptNumber: 1 }, { unique: true });

module.exports = mongoose.model('Sale', saleSchema);
