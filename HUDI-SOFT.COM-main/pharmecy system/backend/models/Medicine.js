const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  barcode: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  buyingPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  batchNumber: { type: String },
  stock: [{
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    quantity: { type: Number, default: 0 }
  }],
  lowStockThreshold: { type: Number, default: 10 },
  image: { type: String } // Cloudinary URL
}, { timestamps: true });

medicineSchema.index({ tenant: 1, barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Medicine', medicineSchema);
