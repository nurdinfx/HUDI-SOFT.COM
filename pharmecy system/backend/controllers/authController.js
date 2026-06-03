const User = require('../models/User');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');

// Generate Token
const generateToken = (id, tenantId) => {
  return jwt.sign({ id, tenantId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new Tenant & Owner
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, businessName } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 1. Create Tenant
    const tenant = await Tenant.create({
      name: businessName || `${name}'s Pharmacy`
    });

    // 2. Create Owner User
    const user = await User.create({
      name,
      email,
      password,
      role: 'Owner',
      tenant: tenant._id
    });

    // 3. Link owner back to tenant
    tenant.owner = user._id;
    await tenant.save();

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant,
        token: generateToken(user._id, user.tenant),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate('tenant');

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        return res.status(401).json({ message: 'User account is deactivated' });
      }

      // Check tenant status if not global Super Admin
      if (user.role !== 'Super Admin' && user.tenant) {
        if (!user.tenant.isActive) {
          return res.status(403).json({ message: 'Business account is deactivated. Please contact support.' });
        }
        if (user.tenant.expiryDate < new Date()) {
          return res.status(403).json({ message: 'Subscription expired. Please renew to continue.' });
        }
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        tenantId: user.tenant?._id,
        businessName: user.tenant?.name,
        token: generateToken(user._id, user.tenant?._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).populate('tenant');

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      tenant: user.tenant
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

module.exports = { registerUser, loginUser, getUserProfile };

