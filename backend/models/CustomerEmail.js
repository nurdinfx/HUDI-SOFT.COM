const mongoose = require('mongoose');

const customerEmailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    companyName: {
        type: String,
        trim: true
    },
    products: [{
        type: String,
        enum: ['POS', 'HMS', 'POS_ONLINE', 'POS_OFFLINE', 'DETAIL_CARE', 'DATEL_CLINIC']
    }],
    subscriptionStatus: {
        type: String,
        enum: ['Active', 'Expired', 'Trial', 'None'],
        default: 'None'
    },
    hasActiveLicense: {
        type: Boolean,
        default: false
    },
    sources: [{
        type: String,
        enum: ['account', 'purchase', 'license', 'activation', 'download', 'newsletter']
    }],
    unsubscribed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('CustomerEmail', customerEmailSchema);
