const Order = require('../models/Order');
const License = require('../models/License');
const crypto = require('crypto');
const syncCustomerEmail = require('../utils/syncCustomerEmail');

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

        // Check if there is an existing license for this user and productType
        const existingLicense = await License.findOne({ userId: order.userId, productType: order.productType });
        
        let license;
        if (existingLicense) {
            // Re-use existing license key and preserve activationDate!
            const now = new Date();
            // Start from the current expiry if it's in the future, otherwise start from now
            const baseDate = new Date(existingLicense.expiryDate) > now ? new Date(existingLicense.expiryDate) : now;
            
            let newExpiry = new Date(baseDate);
            if (order.subscriptionType === 'FiveYear') {
                newExpiry.setFullYear(newExpiry.getFullYear() + 5);
            } else {
                newExpiry.setDate(newExpiry.getDate() + 30);
            }
            
            existingLicense.expiryDate = newExpiry;
            existingLicense.status = 'Active';
            existingLicense.subscriptionType = order.subscriptionType;
            existingLicense.price = order.price;
            existingLicense.companyName = order.companyName || existingLicense.companyName;
            
            license = await existingLicense.save();
            console.log(`[Admin] Reactivated existing license ${license.licenseKey} for user ${order.userId}. New expiry: ${newExpiry}`);
        } else {
            // Generate a new License
            const activationDate = new Date();
            let expiryDate = new Date();

            if (order.subscriptionType === 'FiveYear') {
                expiryDate.setFullYear(expiryDate.getFullYear() + 5);
            } else {
                expiryDate.setDate(expiryDate.getDate() + 30);
            }

            const licenseKey = crypto.randomUUID().toUpperCase();

            license = await License.create({
                userId: order.userId,
                companyName: order.companyName,
                productType: order.productType,
                subscriptionType: order.subscriptionType,
                price: order.price,
                startDate: activationDate,
                activationDate,
                expiryDate,
                status: 'Active',
                licenseKey,
                maxDevices: 10,
                activeDevices: [],
                machineIDs: []
            });
        }

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

        if (status) {
            // If reactivating an expired license, automatically extend it
            if (status === 'Active' && license.status === 'Expired' || (status === 'Active' && new Date(license.expiryDate) < new Date())) {
                const now = new Date();
                if (license.subscriptionType === 'FiveYear') {
                    now.setFullYear(now.getFullYear() + 5);
                } else {
                    now.setDate(now.getDate() + 30);
                }
                license.expiryDate = now;
                console.log(`[Admin] Auto-extending expired license ${license.licenseKey} to ${now}`);
            }
            license.status = status;

            // If activating a license, also ensure the associated user account is active (unsuspended)
            if (status === 'Active' && license.userId) {
                const User = require('../models/User');
                const user = await User.findById(license.userId);
                if (user && user.status !== 'Active') {
                    user.status = 'Active';
                    await user.save();
                    console.log(`[Admin] Activated customer account ${user.email} associated with license ${license.licenseKey}`);
                }
            }
        }
        if (subscriptionType) license.subscriptionType = subscriptionType;
        if (req.body.maxDevices) license.maxDevices = req.body.maxDevices;

        // Reset devices if requested
        if (req.body.resetDevices) {
            console.log(`[Admin] Resetting devices for license: ${license.licenseKey}`);
            license.machineIDs = [];
            license.activeDevices = [];
        }

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

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = async (req, res) => {
    try {
        const User = require('../models/User');
        const License = require('../models/License');
        const customers = await User.find({ role: 'customer' }).select('-password');
        
        const customersWithLicenses = await Promise.all(customers.map(async (cust) => {
            const licenses = await License.find({ userId: cust._id });
            return {
                ...cust.toObject(),
                licenses
            };
        }));
        
        res.json(customersWithLicenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a customer
// @route   POST /api/admin/customers
// @access  Private/Admin
const createCustomer = async (req, res) => {
    const { email, password, companyName, status } = req.body;
    try {
        const User = require('../models/User');
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            email,
            password,
            companyName,
            status: status || 'Active',
            role: 'customer'
        });

        // Sync to central email marketing DB
        await syncCustomerEmail({
            email: user.email,
            name: companyName,
            companyName,
            source: 'account',
            subscriptionStatus: 'None',
            hasActiveLicense: false
        });

        res.status(201).json({
            _id: user._id,
            email: user.email,
            companyName: user.companyName,
            status: user.status,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/admin/customers/:id
// @access  Private/Admin
const updateCustomer = async (req, res) => {
    const { email, companyName, status, password } = req.body;
    try {
        const User = require('../models/User');
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const prevStatus = user.status;

        if (email) user.email = email;
        if (companyName) user.companyName = companyName;
        if (status) user.status = status;
        if (password) user.password = password;

        const updatedUser = await user.save();

        // Sync license statuses when account status changes
        if (status && status !== prevStatus) {
            if (status === 'Active') {
                // Activate all Suspended licenses for this user
                const result = await License.updateMany(
                    { userId: user._id, status: 'Suspended' },
                    { $set: { status: 'Active' } }
                );
                console.log(`[Admin] Activated user ${user.email} — reactivated ${result.modifiedCount} license(s)`);
            } else if (status === 'Suspended') {
                // Suspend all Active licenses for this user
                const result = await License.updateMany(
                    { userId: user._id, status: 'Active' },
                    { $set: { status: 'Suspended' } }
                );
                console.log(`[Admin] Suspended user ${user.email} — suspended ${result.modifiedCount} license(s)`);
            }
        }

        res.json({
            _id: updatedUser._id,
            email: updatedUser.email,
            companyName: updatedUser.companyName,
            status: updatedUser.status,
            role: updatedUser.role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/admin/customers/:id
// @access  Private/Admin
const deleteCustomer = async (req, res) => {
    try {
        const User = require('../models/User');
        const License = require('../models/License');
        const Order = require('../models/Order');

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        await License.deleteMany({ userId: user._id });
        await Order.deleteMany({ userId: user._id });
        await User.deleteOne({ _id: user._id });

        res.json({ message: 'Customer and all associated data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a custom license key
// @route   POST /api/admin/licenses
// @access  Private/Admin
const createLicense = async (req, res) => {
    const { customerEmail, companyName, productType, subscriptionType, price, isTrial, expiryDays, maxDevices } = req.body;
    try {
        const User = require('../models/User');
        const License = require('../models/License');
        const crypto = require('crypto');

        let userId = null;
        let finalCompanyName = companyName;

        if (customerEmail) {
            const user = await User.findOne({ email: customerEmail });
            if (user) {
                userId = user._id;
                if (!finalCompanyName) finalCompanyName = user.companyName;
            } else {
                return res.status(404).json({ message: 'Customer email not found' });
            }
        }

        if (!finalCompanyName) {
            return res.status(400).json({ message: 'Company name is required' });
        }

        const licenseKey = crypto.randomUUID().toUpperCase();
        const activationDate = new Date();
        const expiryDate = new Date();

        if (expiryDays) {
            expiryDate.setDate(expiryDate.getDate() + Number(expiryDays));
        } else if (subscriptionType === 'FiveYear') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        } else {
            expiryDate.setDate(expiryDate.getDate() + 30);
        }

        const newLicense = await License.create({
            userId,
            companyName: finalCompanyName,
            productType: productType || 'HMS',
            subscriptionType: subscriptionType || 'Monthly',
            price: price || 0,
            isTrial: isTrial || false,
            startDate: activationDate,
            activationDate,
            expiryDate,
            status: 'Pending',
            licenseKey,
            maxDevices: maxDevices || 10,
            activeDevices: [],
            machineIDs: []
        });

        res.status(201).json(newLicense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getOrders,
    verifyOrder,
    getLicenses,
    updateLicense,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createLicense
};
