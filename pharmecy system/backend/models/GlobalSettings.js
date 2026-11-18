const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'PharmSaaS' },
  platformLogo: { type: String, default: 'logo.png' },
  defaultCurrency: { type: String, default: 'USD' },
  defaultVat: { type: Number, default: 0 },
  supportEmail: { type: String },
  maintenanceMode: { type: Boolean, default: false },
  allowedPaymentMethods: {
    type: [String],
    default: ['Cash', 'Zaad', 'E-Dahab', 'Sahal', 'Bank Transfer']
  },
  smtpSettings: {
    host: String,
    port: Number,
    user: String,
    pass: String
  }
}, { timestamps: true });

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
