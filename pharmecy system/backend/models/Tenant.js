const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a business name'],
    trim: true
  },
  logo: {
    type: String,
    default: 'default-logo.png'
  },
  tagline: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subscriptionPlan: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium'],
    default: 'Basic'
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Inactive', 'Expired', 'Trial'],
    default: 'Trial'
  },
  expiryDate: {
    type: Date,
    required: true,
    default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
  },
  settings: {
    currency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0 },
    vatPercentage: { type: Number, default: 0 }, // Alias for taxRate
    zaadAccount: { type: String, default: '' },
    sahalAccount: { type: String, default: '' },
    edahabAccount: { type: String, default: '' },
    mycashAccount: { type: String, default: '' },
    pharmacyZaad: { type: String, default: '' },
    pharmacySahal: { type: String, default: '' },
    pharmacyEdahab: { type: String, default: '' },
    pharmacyMycash: { type: String, default: '' },
    paymentMethods: {
      type: [String],
      default: ['Cash', 'Zaad', 'E-Dahab', 'Sahal']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
