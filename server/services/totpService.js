const speakeasy = require('speakeasy');
const crypto = require('crypto');

const TOTP_STEP = 60; // 1 dakika (60 saniye)
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // +/- 1 pencere tolerans

/**
 * Yeni QR secret olustur (kayit sirasinda)
 */
function generateQrSecret() {
  const secret = speakeasy.generateSecret({ length: 20 });
  return secret.base32;
}

/**
 * Mevcut TOTP token olustur
 */
function generateToken(secret) {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
    step: TOTP_STEP,
    digits: TOTP_DIGITS,
  });
}

/**
 * TOTP token dogrula
 */
function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token),
    step: TOTP_STEP,
    digits: TOTP_DIGITS,
    window: TOTP_WINDOW,
  });
}

/**
 * Token hash olustur (replay prevention)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * QR icerik olustur: userId:token
 */
function createQrContent(userId, token) {
  return `${userId}:${token}`;
}

/**
 * QR icerik parse et
 */
function parseQrContent(content) {
  if (!content || typeof content !== 'string') return null;
  const parts = content.split(':');
  if (parts.length !== 2) return null;
  return {
    userId: parts[0],
    token: parts[1],
  };
}

/**
 * Kisa kod olustur (TOTP token zaten 6 haneli numerik)
 */
function getShortCode(secret) {
  return generateToken(secret);
}

/**
 * Bir sonraki token yenilenmesine kalan saniye
 */
function getSecondsUntilRefresh() {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now % TOTP_STEP;
  return TOTP_STEP - elapsed;
}

module.exports = {
  generateQrSecret,
  generateToken,
  verifyToken,
  hashToken,
  createQrContent,
  parseQrContent,
  getShortCode,
  getSecondsUntilRefresh,
  TOTP_STEP,
};
