import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  category: { type: String, required: true },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 },
  isAvailable: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  image: String,
  sku: String,
  barcode: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
