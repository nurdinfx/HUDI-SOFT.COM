// MongoDB authentication controller
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Branch from '../models/Branch.js';

// Demo accounts data
const DEMO_ACCOUNTS = [
  {
    email: 'admin@demo.com',
    password: 'admin123',
    name: 'Demo Admin',
    role: 'admin'
  },
  {
    email: 'manager@demo.com',
    password: 'manager123',
    name: 'Demo Manager',
    role: 'manager'
  },
  {
    email: 'cashier@demo.com',
    password: 'cashier123',
    name: 'Demo Cashier',
    role: 'cashier'
  },
  {
    email: 'chef@demo.com',
    password: 'chef123',
    name: 'Demo Chef',
    role: 'chef'
  },
  {
    email: 'waiter@demo.com',
    password: 'waiter123',
    name: 'Demo Waiter',
    role: 'waiter'
  }
];

// Generate token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'restaurant-secret-key-2024', {
    expiresIn: '2h'
  });
};

// Helper function to get permissions by role
const getPermissionsByRole = (role) => {
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'view_reports', 'manage_settings'],
    manager: ['read', 'write', 'view_reports', 'manage_orders'],
    cashier: ['read', 'write', 'process_payments', 'manage_orders'],
    chef: ['read', 'update_orders', 'view_kitchen'],
    waiter: ['read', 'create_orders', 'update_orders']
  };
  return permissions[role] || ['read'];
};

// Get or create demo branch
const getOrCreateDemoBranch = async () => {
  let branch = await Branch.findOne({ branchCode: 'DEMO' });
  
  if (!branch) {
    const settings = {
      taxRate: 10,
      serviceCharge: 5,
      currency: 'USD',
      timezone: 'UTC'
    };
    
    branch = await Branch.create({
      name: 'Demo Restaurant',
      branchCode: 'DEMO',
      address: '123 Demo Street, Demo City',
      phone: '+1 (555) 123-DEMO',
      email: 'demo@restaurant.com',
      settings,
      isActive: true
    });
  }
  
  return branch;
};

// Get or create demo user
const getOrCreateDemoUser = async (demoAccount, branchId) => {
  let user = await User.findOne({ 
    $or: [
      { email: demoAccount.email }, 
      { username: demoAccount.email }
    ] 
  });
  
  if (!user) {
    user = await User.create({
      name: demoAccount.name,
      email: demoAccount.email,
      username: demoAccount.email,
      password: demoAccount.password, // Pre-save hook handles hashing
      role: demoAccount.role,
      branch: branchId,
      isActive: true
    });
  } else {
    // Update last login (timestamps handle this)
    user.updatedAt = new Date();
    await user.save();
  }
  
  return user;
};

// Login - MongoDB
export const login = async (req, res) => {
  try {
    console.log('📥 Login request body:', req.body);

    const { email, username, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username and password are required'
      });
    }

    // Check if demo account
    const demoAccount = DEMO_ACCOUNTS.find(acc => acc.email === loginIdentifier);
    
    if (demoAccount) {
      console.log('🔐 Demo account detected:', loginIdentifier);

      if (demoAccount.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid demo credentials'
        });
      }

      // Get or create demo branch
      const branch = await getOrCreateDemoBranch();
      
      // Get or create demo user
      const user = await getOrCreateDemoUser(demoAccount, branch._id);

      const token = `demo-${user.role}-${Date.now()}`;

      const userData = {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isDemo: true,
        permissions: getPermissionsByRole(user.role),
        branch: {
          _id: branch._id.toString(),
          name: branch.name,
          branchCode: branch.branchCode,
          settings: branch.settings
        },
        createdAt: user.createdAt,
        lastLogin: new Date().toISOString()
      };

      console.log('✅ Demo login successful for:', user.email);

      return res.json({
        success: true,
        message: 'Demo login successful',
        data: {
          token,
          user: userData
        }
      });
    }

    // Real account login
    console.log('🔐 Real account login attempt:', loginIdentifier);
    const user = await User.findOne({ 
      $or: [
        { email: loginIdentifier }, 
        { username: loginIdentifier }
      ] 
    }).populate('branch');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    // Check password using the User model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Get branch (already populated)
    const branch = user.branch;
    if (!branch) {
      return res.status(401).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    // Update last login
    user.updatedAt = new Date();
    await user.save();

    const userData = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isDemo: false,
      permissions: getPermissionsByRole(user.role),
      branch: {
        _id: branch._id.toString(),
        name: branch.name,
        branchCode: branch.branchCode,
        settings: branch.settings
      },
      createdAt: user.createdAt,
      lastLogin: new Date().toISOString()
    };

    console.log('✅ Real login successful for:', user.email);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userData
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Registration - MongoDB
export const register = async (req, res) => {
  try {
    const { name, email, username, password, role, branchId } = req.body;

    console.log('Registration attempt:', email || username);

    if (!name || (!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email/username, and password are required'
      });
    }

    // Check if demo account
    if (email && DEMO_ACCOUNTS.some(acc => acc.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register with demo account email'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email || '' }, 
        { username: username || '' }
      ] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Get or create branch
    let branch;
    if (branchId) {
      branch = await Branch.findById(branchId);
    } else {
      branch = await Branch.findOne({ branchCode: 'MAIN' });
      if (!branch) {
        branch = await Branch.create({
          name: 'My Restaurant',
          branchCode: 'MAIN',
          address: 'Add your restaurant address',
          phone: '+1 (555) 123-4567',
          email: email || `${username}@local.user`,
          settings: { taxRate: 10, serviceCharge: 5, currency: 'USD', timezone: 'UTC' },
          isActive: true
        });
      }
    }

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email || `${username}@local.user`,
      username,
      password, // Pre-save hook hashes password
      role: role || 'manager',
      branch: branch._id,
      isActive: true
    });

    // Generate token
    const token = generateToken(user._id.toString());

    const userData = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isDemo: false,
      permissions: getPermissionsByRole(user.role),
      branch: {
        _id: branch._id.toString(),
        name: branch.name,
        branchCode: branch.branchCode,
        settings: branch.settings
      },
      createdAt: user.createdAt,
      lastLogin: new Date().toISOString()
    };

    console.log('✅ Registration successful for:', user.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: userData
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Get current user - MongoDB
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('branch');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const branch = user.branch;
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    const userData = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isDemo: false,
      permissions: getPermissionsByRole(user.role),
      branch: {
        _id: branch._id.toString(),
        name: branch.name,
        branchCode: branch.branchCode,
        settings: branch.settings
      },
      createdAt: user.createdAt,
      lastLogin: new Date().toISOString()
    };

    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Logout
export const logout = async (req, res) => {
  console.log('🚪 Logout for user:', req.user?.email || req.user?.id);
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Get demo accounts info
export const getDemoAccounts = async (req, res) => {
  res.json({
    success: true,
    data: DEMO_ACCOUNTS.map(acc => ({
      email: acc.email,
      password: acc.password,
      role: acc.role,
      name: acc.name
    }))
  });
};

// Check if email exists - MongoDB
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    const exists = !!user;

    res.json({
      success: true,
      data: {
        exists,
        isDemo: DEMO_ACCOUNTS.some(acc => acc.email === email)
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

