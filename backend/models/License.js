const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for trial licenses
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: false
    },
    isTrial: {
        type: Boolean,
        default: false
    },
    companyName: {
        type: String,
        required: true
    },
    productType: {
        type: String,
        enum: ['POS', 'HMS', 'POS_ONLINE', 'POS_OFFLINE', 'DETAIL_CARE', 'DATEL_CLINIC'],
        required: true
    },
    subscriptionType: {
        type: String,
        enum: ['FiveYear', 'Monthly'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    // startDate is set once when the license is created and never overwritten
    startDate: {
        type: Date,
        default: Date.now
    },
    // activationDate kept for backward compatibility
    activationDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Suspended', 'Pending'],
        default: 'Pending'
    },
    // activeDevices: primary device tracking array (max 10)
    activeDevices: [{
        type: String
    }],
    // machineIDs kept for backward compatibility (mirrors activeDevices)
    machineIDs: [{
        type: String
    }],
    maxDevices: {
        type: Number,
        default: 10 // Each license supports up to 10 devices
    },
    licenseKey: {
        type: String,
        required: true,
        unique: true
    },
    lastPaymentDate: {
        type: Date,
        default: Date.now
    },
    gracePeriodEndDate: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('License', licenseSchema);
