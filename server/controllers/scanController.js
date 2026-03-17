const scanService = require('../services/scanService');
const totpService = require('../services/totpService');
const codeService = require('../services/codeService');
const User = require('../models/User');

/**
 * POST /api/scan/qr
 * Body: { qrContent: "userId:token" }
 */
async function scanQR(req, res) {
  const { qrContent } = req.body;

  if (!qrContent) {
    return res.status(400).json({ error: 'missing_qr', message: 'QR içeriği gerekli' });
  }

  const parsed = totpService.parseQrContent(qrContent);
  if (!parsed) {
    return res.status(400).json({ error: 'invalid_qr', message: 'Geçersiz QR kod formatı' });
  }

  const result = await scanService.processScan(req.user.id, parsed.userId, parsed.token);

  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

/**
 * POST /api/scan/manual
 * Body: { userId, shortCode }
 */
async function scanManual(req, res) {
  const { userId, shortCode } = req.body;

  if (!userId || !shortCode) {
    return res.status(400).json({ error: 'missing_fields', message: 'Kullanıcı ID ve kısa kod gerekli' });
  }

  // Short code = TOTP token, aynı doğrulama mantığı
  const result = await scanService.processScan(req.user.id, userId, shortCode);

  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

/**
 * POST /api/code/redeem
 * Body: { code }
 * Tek kod alanı: önce sürpriz kod, sonra TOTP eşleştirme
 */
async function redeemCode(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'missing_code', message: 'Kod gerekli' });
  }

  const result = await codeService.redeemCode(req.user.id, code);

  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

module.exports = { scanQR, scanManual, redeemCode };
