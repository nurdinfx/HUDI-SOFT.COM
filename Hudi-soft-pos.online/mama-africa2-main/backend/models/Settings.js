import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'Mama Africa Restaurant' },
  logoUrl: { type: String, default: '' },
  taxRate: { type: Number, default: 10 },
  serviceCharge: { type: Number, default: 5 },
  currency: { type: String, default: 'USD' },
  receiptFooter: { type: String, default: 'Thank you for dining with us!' },
  receiptSize: { type: String, default: '80mm' },
  
  // Mobile Payment Accounts
  zaad: { type: String, default: '' },
  sahal: { type: String, default: '' },
  edahab: { type: String, default: '' },
  myCash: { type: String, default: '' },
  
  // Business Information
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  taxId: { type: String, default: '' },
  
  // Business Hours
  businessHours: { type: mongoose.Schema.Types.Mixed },
  
  // System Preferences
  autoBackup: { type: Boolean, default: true },
  lowStockAlert: { type: Boolean, default: true },
  orderNotifications: { type: Boolean, default: true },
  printReceipt: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC-5' },
  businessType: { type: String, enum: ['restaurant', 'supermarket', 'both'], default: 'both' },
  enableHotel: { type: Boolean, default: false },

  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
