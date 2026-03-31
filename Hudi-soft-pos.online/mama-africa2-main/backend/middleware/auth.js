// MongoDB auth middleware
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Demo accounts configuration
const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', password: 'admin123', name: 'Demo Admin', role: 'admin' },
  { email: 'manager@demo.com', password: 'manager123', name: 'Demo Manager', role: 'manager' },
  { email: 'cashier@demo.com', password: 'cashier123', name: 'Demo Cashier', role: 'cashier' },
  { email: 'chef@demo.com', password: 'chef123', name: 'Demo Chef', role: 'chef' },
  { email: 'waiter@demo.com', password: 'waiter123', name: 'Demo Waiter', role: 'waiter' }
];

// Helper to get or create demo branch - MongoDB
const getOrCreateDemoBranch = async () => {
  let branch = await Branch.findOne({ branchCode: 'DEMO' });
  
  if (!branch) {
    branch = await Branch.create({
      name: 'Demo Restaurant',
      branchCode: 'DEMO',
      address: '123 Demo Street, Demo City',
      phone: '+1 (555) 123-DEMO',
      email: 'demo@restaurant.com',
      isActive: true
    });
  }
  
  return branch;
};

// Helper to get or create demo user - MongoDB
const getOrCreateDemoUser = async (demoAccount, branchId) => {
  let user = await User.findOne({ email: demoAccount.email });
  
  if (!user) {
    const hashedPassword = await bcrypt.hash(demoAccount.password, 10);
    user = await User.create({
      name: demoAccount.name,
      email: demoAccount.email,
      username: demoAccount.email,
      password: hashedPassword,
      role: demoAccount.role,
      branch: branchId,
      isActive: true
    });
  }
  
  return user;
};

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token = null;
    
    if (authHeader) {
      token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided. Please login again.', code: 'UNAUTHORIZED' });
    }

    // Handle demo tokens
    if (token.startsWith('demo-')) {
      const tokenParts = token.split('-');
      const demoRole = tokenParts[1];
      const demoAccount = DEMO_ACCOUNTS.find(acc => acc.role === demoRole);
      
      if (!demoAccount) {
        return res.status(401).json({ success: false, message: 'Invalid demo token' });
      }

      const demoBranch = await getOrCreateDemoBranch();
      const demoUser = await getOrCreateDemoUser(demoAccount, demoBranch._id);

      req.user = {
        id: demoUser._id.toString(),
        _id: demoUser._id.toString(),
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        isDemo: true,
        branch: {
          _id: demoBranch._id.toString(),
          id: demoBranch._id.toString(),
          name: demoBranch.name,
          branchCode: demoBranch.branchCode
          // Settings can be fetched via settingsController or populated if needed
        }
      };
      
      return next();
    }

    // Verify real JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'restaurant-secret-key-2024');
      
      const user = await User.findById(decoded.id).populate('branch');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account is deactivated' });
      }

      if (!user.branch) {
        return res.status(401).json({ success: false, message: 'Branch not assigned' });
      }

      req.user = {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isDemo: false,
        branch: {
          _id: user.branch._id.toString(),
          id: user.branch._id.toString(),
          name: user.branch.name,
          branchCode: user.branch.branchCode
        }
      };
      
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.', code: 'UNAUTHORIZED' });
    }

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Authentication failed', code: 'AUTH_ERROR' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
};

export default auth;

