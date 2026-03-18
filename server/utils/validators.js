/**
 * Validate email format
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validate password strength (min 6 chars)
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Validate role enum
 */
function isValidRole(role) {
  return ['admin', 'mentor', 'startup', 'participant', 'gorevli', 'kayit_gorevli'].includes(role);
}

/**
 * Sanitize string input
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidRole,
  sanitize,
};
