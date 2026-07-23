import mongoose from 'mongoose';

const financeSchema = new mongoose.Schema({
  type:          { type: String, enum: ['income', 'expense'], required: true },
  amount:        { type: Number, required: true },
  description:   { type: String, default: '' },
  category:      { type: String, default: 'General' },
  paymentMethod: { type: String, default: 'cash' },
  reference:     { type: String, default: '' },
  date:          { type: Date, default: Date.now },
  branch:        { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('Finance', financeSchema);
