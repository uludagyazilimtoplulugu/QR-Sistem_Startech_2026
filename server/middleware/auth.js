const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * JWT authentication middleware
 * Extracts token from Authorization header or cookie
 * Attaches req.user = { id, email, role }
 */
function authMiddleware(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to cookie
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'auth_required', message: 'Giriş yapmanız gerekiyor' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token_expired', message: 'Oturum süresi doldu' });
    }
    return res.status(401).json({ error: 'invalid_token', message: 'Geçersiz oturum' });
  }
}

module.exports = authMiddleware;
