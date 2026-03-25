const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    systemType: {
        type: String,
        enum: [
            'POS', 
            'HMS', 
            'Retail Consultation', 
            'I\'d like a POS consultation', 
            'I\'d like a Hospital System consultation',
            'I\'m an existing customer',
            'Other'
        ],
        default: 'Other'
    },
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Closed'],
        default: 'New'
    },
    zipCode: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    trialLicenseKey: {
        type: String,
        trim: true
    },
    trialExpiryDate: {
        type: Date
    },
    requestedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
