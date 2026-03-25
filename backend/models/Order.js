const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    productType: {
        type: String,
        enum: ['POS', 'HMS'],
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
    paymentMethod: {
        type: String,
        enum: ['EVC Plus', 'ZAAD', 'Sahal'],
        required: true
    },
    paymentScreenshotUrl: {
        type: String, // Path or URL to uploaded screenshot
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    adminNotes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
