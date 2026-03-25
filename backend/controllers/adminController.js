const Order = require('../models/Order');
const License = require('../models/License');
const crypto = require('crypto');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const licenses = await License.find({});
        const orders = await Order.find({});

        const totalRevenue = orders
            .filter(o => o.status === 'Verified')
            .reduce((acc, order) => acc + order.price, 0);

        const monthlyRevenue = orders
            .filter(o => o.status === 'Verified' && o.subscriptionType === 'Monthly')
            .reduce((acc, order) => acc + order.price, 0);

        const fiveYearRevenue = orders
            .filter(o => o.status === 'Verified' && o.subscriptionType === 'FiveYear')
            .reduce((acc, order) => acc + order.price, 0);

        const activeLicenses = licenses.filter(l => l.status === 'Active').length;
        const expiredLicenses = licenses.filter(l => l.status === 'Expired').length;
        const recurringCount = licenses.filter(l => l.subscriptionType === 'Monthly').length;

        res.json({
            totalRevenue,
            monthlyRevenue,
            fiveYearRevenue,
            activeLicenses,
            expiredLicenses,
            recurringCount,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'Pending').length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('userId', 'email companyName');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify payment and generate license
// @route   PUT /api/admin/orders/:id/verify
// @access  Private/Admin
const verifyOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Verified') {
            return res.status(400).json({ message: 'Order is already verified' });
        }

        order.status = 'Verified';
        const updatedOrder = await order.save();

        // Generate License
        const activationDate = new Date();
        let expiryDate = new Date();

        if (order.subscriptionType === 'FiveYear') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        } else {
            expiryDate.setDate(expiryDate.getDate() + 30);
        }

        const licenseKey = crypto.randomUUID().toUpperCase();

        const license = await License.create({
            userId: order.userId,
            companyName: order.companyName,
            productType: order.productType,
            subscriptionType: order.subscriptionType,
            price: order.price,
            activationDate,
            expiryDate,
            status: 'Active',
            licenseKey
        });

        res.json({ message: 'Order verified and license generated', order: updatedOrder, license });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all licenses
// @route   GET /api/admin/licenses
// @access  Private/Admin
const getLicenses = async (req, res) => {
    try {
        const licenses = await License.find({}).populate('userId', 'email');
        res.json(licenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update license status
// @route   PUT /api/admin/licenses/:id
// @access  Private/Admin
const updateLicense = async (req, res) => {
    const { status, subscriptionType, addMonths, addYears } = req.body;

    try {
        const license = await License.findById(req.params.id);

        if (!license) {
            return res.status(404).json({ message: 'License not found' });
        }

        if (status) license.status = status;
        if (subscriptionType) license.subscriptionType = subscriptionType;

        // Extend expiry
        if (addMonths) {
            const currentExpiry = new Date(license.expiryDate);
            currentExpiry.setMonth(currentExpiry.getMonth() + Number(addMonths));
            license.expiryDate = currentExpiry;
        }

        if (addYears) {
            const currentExpiry = new Date(license.expiryDate);
            currentExpiry.setFullYear(currentExpiry.getFullYear() + Number(addYears));
            license.expiryDate = currentExpiry;
        }

        const updatedLicense = await license.save();
        res.json(updatedLicense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats, getOrders, verifyOrder, getLicenses, updateLicense };
