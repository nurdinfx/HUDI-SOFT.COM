const jwt = require('jsonwebtoken');

const generateToken = (id, role, clinicId) => {
  const secret = process.env.JWT_SECRET || 'hudi-soft-datel-clinic-fallback-secret-2026-do-not-use-in-prod';
  return jwt.sign({ id, role, clinicId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

module.exports = generateToken;
