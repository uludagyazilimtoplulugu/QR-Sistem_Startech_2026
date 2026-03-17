const SurpriseCode = require('../models/SurpriseCode');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const totpService = require('./totpService');
const scanService = require('./scanService');
const db = require('../config/database');

/**
 * Tek kod girisi: once surpriz kod dene, sonra TOTP eslestir
 */
async function redeemCode(userId, code) {
  const user = await User.findById(userId);
  if (!user) {
    return { status: 'error', message: 'Kullanici bulunamadi' };
  }

  if (user.role !== 'participant') {
    return { status: 'error', message: 'Sadece katilimcilar kod kullanabilir' };
  }

  const trimmedCode = code.trim();

  // 1) Once surpriz kod mu bak
  const surpriseResult = await trySurpriseCode(userId, trimmedCode);
  if (surpriseResult) return surpriseResult;

  // 2) Degilde, TOTP kodu mu bak (6 haneli numerik ise)
  if (/^\d{6}$/.test(trimmedCode)) {
    const totpResult = await tryTotpCode(userId, trimmedCode);
    if (totpResult) return totpResult;
  }

  return { status: 'error', message: 'Gecersiz kod' };
}

/**
 * Surpriz kod denemesi
 */
async function trySurpriseCode(userId, code) {
  const surpriseCode = await SurpriseCode.findByCode(code.toUpperCase());
  if (!surpriseCode) return null; // surpriz kod degil

  if (surpriseCode.is_used) {
    return { status: 'warning', message: 'Bu kod daha once kullanilmis' };
  }

  // Kodu kullan
  await SurpriseCode.markUsed(surpriseCode.id, userId);
  await User.updatePoints(userId, surpriseCode.points_value);

  await Transaction.create({
    scannerId: userId,
    scannedId: null,
    points: surpriseCode.points_value,
    type: 'surprise',
    surpriseCodeId: surpriseCode.id,
    description: `Surpriz kod: ${code} (+${surpriseCode.points_value} puan)`,
  });

  return {
    status: 'success',
    message: `+${surpriseCode.points_value} puan kazandiniz!`,
    points: surpriseCode.points_value,
  };
}

/**
 * TOTP kodu eslestirme — tum kullanicilarin secret'ini kontrol et
 */
async function tryTotpCode(scannerId, token) {
  // Kendi disindaki tum kullanicilarin id + qr_secret bilgisini al
  const { rows } = await db.query(
    'SELECT id, qr_secret, role FROM users WHERE id != $1 AND qr_secret IS NOT NULL',
    [scannerId]
  );

  // Her kullanicinin TOTP'sini dene
  for (const target of rows) {
    const isValid = totpService.verifyToken(target.qr_secret, token);
    if (isValid) {
      // Eslesti! processScan ile devam et
      return await scanService.processScan(scannerId, target.id, token);
    }
  }

  return null; // hicbiri eslesme
}

module.exports = { redeemCode };
