// backend/models/EquityTransaction.js
import mongoose from 'mongoose';

const equityTransactionSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['capital_contribution', 'owner_withdrawal', 'dividend', 'retained_earnings_adjustment'], 
    required: true 
  },
  ownerName: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialAccount' },
  paymentMethod: { type: String, default: 'cash' }, // cash, bank, mobile_money
  description: { type: String, default: '' },
  reference: { type: String, default: '' },
  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

equityTransactionSchema.index({ transactionNumber: 1, branch: 1 }, { unique: true });
equityTransactionSchema.index({ date: -1, branch: 1 });

export default mongoose.model('EquityTransaction', equityTransactionSchema);
