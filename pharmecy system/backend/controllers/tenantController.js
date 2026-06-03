const Tenant = require('../models/Tenant');

// @desc    Get tenant settings
// @route   GET /api/v1/tenant/settings
// @access  Private
const getTenantSettings = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenant);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update tenant settings
// @route   PUT /api/v1/tenant/settings
// @access  Private (Owner only)
const updateTenantSettings = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenant);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Update core fields
    const { name, logo, tagline, address, phone, email, website, settings } = req.body;

    if (name) tenant.name = name;
    if (logo) tenant.logo = logo;
    if (tagline) tenant.tagline = tagline;
    if (address) tenant.address = address;
    if (phone) tenant.phone = phone;
    if (email) tenant.email = email;
    if (website) tenant.website = website;

    // Update settings object
    if (settings) {
      tenant.settings = {
        ...tenant.settings,
        ...settings
      };
      // Keep vatPercentage in sync with taxRate if taxRate is provided
      if (settings.taxRate !== undefined) {
        tenant.settings.vatPercentage = settings.taxRate;
      }
    }

    const updatedTenant = await tenant.save();

    res.json({
      success: true,
      data: updatedTenant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTenantSettings,
  updateTenantSettings
};
