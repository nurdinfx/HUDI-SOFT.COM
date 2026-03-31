import mongoose from 'mongoose';

const customerLedgerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transactionType: { type: String, enum: ['sale', 'payment', 'refund'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

export default mongoose.model('CustomerLedger', customerLedgerSchema);
