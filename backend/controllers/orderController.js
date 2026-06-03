const Order = require('../models/Order');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Create a new order & user if not exists
// @route   POST /api/orders
// @access  Public
const createOrder = async (req, res) => {
    const { companyName, email, productType, subscriptionType, paymentMethod } = req.body;
    const paymentScreenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!paymentScreenshotUrl) {
        return res.status(400).json({ message: 'Payment screenshot is required' });
    }

    try {
        let price = subscriptionType === 'FiveYear' ? 400 : 15;

        // Check if user exists by email, if not create them
        let user = await User.findOne({ email });
        let isNewUser = false;
        let autoPassword = '';

        if (!user) {
            isNewUser = true;
            autoPassword = Math.random().toString(36).slice(-8); // Generate random password
            user = await User.create({
                email,
                password: autoPassword,
                companyName,
                role: 'customer'
            });
        }

        const order = await Order.create({
            userId: user._id,
            companyName,
            productType,
            subscriptionType,
            price,
            paymentMethod,
            paymentScreenshotUrl
        });

        res.status(201).json({
            message: 'Order created successfully',
            order: order,
            userCreated: isNewUser,
            email: user.email,
            temporaryPassword: isNewUser ? autoPassword : null // Suggest they change it later or receive via email
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createOrder };
