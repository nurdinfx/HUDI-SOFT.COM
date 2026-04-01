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
        enum: ['POS Online', 'POS Desktop', 'Inventory System', 'Existing Customer', 'Other'],
        required: true,
        trim: true,
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
    timestamps: true,
    bufferCommands: true // Redundant fix for persistent connection errors
});

// Added pre-validate hook for deep debugging on Render
leadSchema.pre('validate', function(next) {
    if (this.systemType) {
        console.log(`🔍 [PRE-VALIDATE] systemType: "${this.systemType}" (Length: ${this.systemType.length})`);
    }
    next();
});

module.exports = mongoose.model('Lead', leadSchema);
