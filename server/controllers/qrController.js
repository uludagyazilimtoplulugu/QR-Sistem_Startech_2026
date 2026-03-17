const User = require('../models/User');
const totpService = require('../services/totpService');

/**
 * GET /api/qr/generate
 * Kullanıcının QR kodunu ve kısa kodunu üretir
 */
async function generate(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'user_not_found', message: 'Kullanıcı bulunamadı' });
  }

  const token = totpService.generateToken(user.qr_secret);
  const qrContent = totpService.createQrContent(user.id, token);
  const shortCode = totpService.getShortCode(user.qr_secret);
  const secondsLeft = totpService.getSecondsUntilRefresh();

  res.json({
    qrContent,
    shortCode,
    secondsLeft,
    step: totpService.TOTP_STEP,
  });
}

module.exports = { generate };
