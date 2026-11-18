const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');

// @desc    Get Platform-wide Stats
// @route   GET /api/v1/superadmin/stats
// @access  Private (Super Admin Only)
const getPlatformStats = async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ isActive: true });
    const expiredTenants = await Tenant.countDocuments({ expiryDate: { $lt: new Date() } });
    
    const totalBranches = await Branch.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Revenue across all tenants (Simplification: sum of grandTotal of all sales)
    const sales = await Sale.find();
    const totalSystemRevenue = sales.reduce((acc, s) => acc + s.grandTotal, 0);

    // Monthly Growth (Mocking for now, could be dynamic)
    const monthlyGrowth = [
      { month: 'Jan', revenue: 4000, tenants: 12 },
      { month: 'Feb', revenue: 5500, tenants: 18 },
      { month: 'Mar', revenue: 7000, tenants: 25 },
    ];

    res.json({
      totalTenants,
      activeTenants,
      expiredTenants,
      totalBranches,
      totalUsers,
      totalSystemRevenue,
      monthlyGrowth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Tenants
// @route   GET /api/v1/superadmin/tenants
const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().populate('owner', 'name email');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Tenant Status / Expiry
// @route   PUT /api/v1/superadmin/tenants/:id
const updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    tenant.isActive = req.body.isActive !== undefined ? req.body.isActive : tenant.isActive;
    tenant.subscriptionPlan = req.body.subscriptionPlan || tenant.subscriptionPlan;
    
    if (req.body.extendDays) {
      const newDate = new Date(tenant.expiryDate);
      newDate.setDate(newDate.getDate() + req.body.extendDays);
      tenant.expiryDate = newDate;
    }

    await tenant.save();
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlatformStats, getAllTenants, updateTenant };
