/**
 * Role-based access control middleware
 * Usage: roleGuard('admin') or roleGuard('mentor', 'startup')
 * Must be used AFTER auth middleware
 */
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'auth_required', message: 'Giriş yapmanız gerekiyor' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden', message: 'Bu işlemi yapmaya yetkiniz yok' });
    }

    next();
  };
}

module.exports = roleGuard;
