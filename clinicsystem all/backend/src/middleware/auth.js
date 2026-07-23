const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

/**
 * protect — Verifies JWT, attaches req.user
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, clinic_id, full_name, email, role, is_active FROM clinic_users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length) return res.status(401).json({ message: 'User not found' });
    if (!rows[0].is_active) return res.status(403).json({ message: 'Account deactivated. Contact your clinic admin.' });

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('[Auth] Token failed:', err.message);
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

/**
 * authorize(...roles) — Role-based access control
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role(s): ${roles.join(', ')}`,
    });
  }
  next();
};

/**
 * requireActiveSubscription — Checks clinic subscription before granting access
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, subscription_status, is_active FROM clinics WHERE id = $1',
      [req.user.clinic_id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(403).json({ message: 'Clinic not found or inactive.' });
    }

    const status = rows[0].subscription_status;
    if (status === 'Suspended') {
      return res.status(403).json({ message: 'Clinic subscription suspended. Please contact support.' });
    }
    if (status === 'Expired') {
      return res.status(403).json({ message: 'Clinic subscription has expired. Please renew.' });
    }

    req.clinic = rows[0];
    next();
  } catch (err) {
    console.error('[Auth] Subscription check error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { protect, authorize, requireActiveSubscription };
