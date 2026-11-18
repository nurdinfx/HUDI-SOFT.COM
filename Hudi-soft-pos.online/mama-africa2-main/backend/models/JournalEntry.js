// backend/models/JournalEntry.js
import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialAccount' },
  accountNumber: String,
  accountName: String,
  accountType: String,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  description: String
});

const journalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  reference: { type: String, default: '' },
  source: { 
    type: String, 
    enum: [
      'pos_sale', 
      'purchase', 
      'expense', 
      'owner_contribution', 
      'owner_withdrawal', 
      'account_transfer', 
      'debt_payment', 
      'manual_journal',
      'adjustment'
    ], 
    default: 'manual_journal' 
  },
  description: { type: String, required: true },
  lines: [journalLineSchema],
  totalAmount: { type: Number, required: true },
  isBalanced: { type: Boolean, default: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  audit: {
    userName: String,
    userRole: String,
    ip: String
  }
}, { timestamps: true });

journalEntrySchema.index({ entryNumber: 1, branch: 1 }, { unique: true });
journalEntrySchema.index({ date: -1, branch: 1 });

export default mongoose.model('JournalEntry', journalEntrySchema);
