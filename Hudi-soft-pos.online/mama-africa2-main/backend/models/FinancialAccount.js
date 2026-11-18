// backend/models/FinancialAccount.js
import mongoose from 'mongoose';

const financialAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountType: { 
    type: String, 
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], 
    required: true 
  },
  subType: { 
    type: String, 
    enum: [
      'cash', 
      'bank', 
      'mobile_money', 
      'accounts_receivable', 
      'inventory_asset', 
      'fixed_asset', 
      'other_asset',
      'accounts_payable', 
      'short_term_liability', 
      'long_term_liability', 
      'owner_capital', 
      'owner_drawings', 
      'retained_earnings', 
      'sales_revenue', 
      'other_revenue', 
      'cogs', 
      'operating_expense', 
      'payroll_expense'
    ], 
    required: true 
  },
  currency: { type: String, default: 'USD' },
  openingBalance: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  institutionName: { type: String, default: '' }, // e.g. "Premier Bank", "Dahabshiil", "Hormuud EVC Plus", "Telesom ZAAD"
  accountDetails: { type: String, default: '' },   // phone number, account number, or IBAN
  description: { type: String, default: '' },
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

financialAccountSchema.index({ accountNumber: 1, branch: 1 }, { unique: true });

export default mongoose.model('FinancialAccount', financialAccountSchema);
