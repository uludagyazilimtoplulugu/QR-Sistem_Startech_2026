const crypto = require('crypto');

/**
 * SHA-256 hash of a token string for replay prevention
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = hashToken;
