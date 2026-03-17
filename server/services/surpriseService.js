const SurpriseCode = require('../models/SurpriseCode');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Surpriz kod kullan
 */
async function redeemCode(userId, code) {
  const user = await User.findById(userId);
  if (!user) {
    return { status: 'error', message: 'Kullanici bulunamadi' };
  }

  if (user.role !== 'participant') {
    return { status: 'error', message: 'Sadece katilimcilar kod kullanabilir' };
  }

  const surpriseCode = await SurpriseCode.findByCode(code.trim().toUpperCase());
  if (!surpriseCode) {
    return { status: 'error', message: 'Gecersiz kod' };
  }

  if (surpriseCode.is_used) {
    return { status: 'warning', message: 'Bu kod daha once kullanilmis' };
  }

  // Kodu kullan
  await SurpriseCode.markUsed(surpriseCode.id, userId);
  await User.updatePoints(userId, surpriseCode.points_value);

  // Transaction kaydi
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

module.exports = { redeemCode };
