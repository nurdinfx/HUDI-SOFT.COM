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
        enum: ['POS', 'HMS', 'POS_ONLINE', 'POS_OFFLINE'],
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
    machineID: {
        type: String, // Filled when desktop app connects
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
