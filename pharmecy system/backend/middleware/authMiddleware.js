const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password').populate('tenant');
      req.tenantId = decoded.tenantId; // Shared across all controllers for scoping
      
      if (!req.user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      // Check tenant status if not global Super Admin
      if (req.user.role !== 'Super Admin' && req.user.tenant) {
        if (!req.user.tenant.isActive) {
          return res.status(403).json({ message: 'Business account is deactivated.' });
        }
        if (req.user.tenant.expiryDate < new Date()) {
          return res.status(403).json({ message: 'Subscription expired. Please renew.' });
        }
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
