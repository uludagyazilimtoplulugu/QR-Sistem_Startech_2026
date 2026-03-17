const User = require('../models/User');
const UsedToken = require('../models/UsedToken');
const PendingScan = require('../models/PendingScan');
const Transaction = require('../models/Transaction');
const ApprovalQueue = require('../models/ApprovalQueue');
const PointConfig = require('../models/PointConfig');
const totpService = require('../services/totpService');

/**
 * Ana tarama islemi
 * @param {string} scannerId - Tarayan kullanici ID
 * @param {string} targetUserId - Hedef kullanici ID
 * @param {string} token - TOTP token
 * @returns {object} { status, message, points? }
 */
async function processScan(scannerId, targetUserId, token) {
  // 1. Kendini tarama kontrolu
  if (scannerId === targetUserId) {
    return { status: 'error', message: 'Kendi kodunuzu tarayamazsiniz' };
  }

  // 2. Kullanicilari al
  const scanner = await User.findById(scannerId);
  const target = await User.findById(targetUserId);

  if (!scanner || !target) {
    return { status: 'error', message: 'Kullanici bulunamadi' };
  }

  // 3. Token dogrulama
  const isValid = totpService.verifyToken(target.qr_secret, token);
  if (!isValid) {
    return { status: 'error', message: 'QR kod gecersiz veya suresi dolmus' };
  }

  // 4. Token replay kontrolu
  const tokenHash = totpService.hashToken(`${targetUserId}:${token}`);
  const alreadyUsed = await UsedToken.isUsed(tokenHash);
  if (alreadyUsed) {
    return { status: 'error', message: 'Bu QR kod daha once kullanildi' };
  }
  await UsedToken.markUsed(tokenHash, scannerId);

  // 5. Gunluk tekrar kontrolu
  const dailyExists = await Transaction.checkDailyPair(scannerId, targetUserId);
  if (dailyExists) {
    return { status: 'warning', message: 'Bugun bu kisiyle zaten puan kazandiniz' };
  }

  // 6. Rol bazli isleme
  const scannerRole = scanner.role;
  const targetRole = target.role;

  // Admin ve gorevli taramalari (oda disinda) reddet
  if (scannerRole === 'admin' || scannerRole === 'gorevli') {
    return { status: 'error', message: 'Bu rol ile tarama yapamazsiniz' };
  }
  if (targetRole === 'admin' || targetRole === 'gorevli') {
    return { status: 'error', message: 'Bu kisiyi tarayamazsiniz' };
  }

  // ---- Katilimci <-> Katilimci: Karsilikli tarama ----
  if (scannerRole === 'participant' && targetRole === 'participant') {
    return await handleMutualScan(scanner, target);
  }

  // ---- Katilimci -> Mentor/Startup: Onay kuyruguna ekle ----
  if (scannerRole === 'participant' && (targetRole === 'mentor' || targetRole === 'startup')) {
    return await handleApprovalRequest(scanner, target);
  }

  // ---- Mentor/Startup -> Katilimci: Onay kuyruguna ekle (ters tarama) ----
  if ((scannerRole === 'mentor' || scannerRole === 'startup') && targetRole === 'participant') {
    return await handleApprovalRequest(target, scanner);
  }

  // ---- Mentor/Startup <-> Mentor/Startup ----
  if ((scannerRole === 'mentor' || scannerRole === 'startup') && (targetRole === 'mentor' || targetRole === 'startup')) {
    return { status: 'warning', message: 'Mentor ve startuplar birbirini tarayamaz' };
  }

  return { status: 'error', message: 'Gecersiz tarama kombinasyonu' };
}

/**
 * Katilimci-Katilimci karsilikli tarama
 */
async function handleMutualScan(scanner, target) {
  // Ters yonde pending var mi?
  const reversePending = await PendingScan.findReverse(scanner.id, target.id);

  if (reversePending) {
    // Karsilikli tarama tamamlandi!
    await PendingScan.markCompleted(reversePending.id);

    // Her ikisine de puan ver
    const points = await PointConfig.getByRole('participant');

    await User.updatePoints(scanner.id, points);
    await User.updatePoints(target.id, points);

    // Transaction kayitlari
    await Transaction.create({
      scannerId: scanner.id,
      scannedId: target.id,
      points,
      type: 'earn',
      description: `Karsilikli tarama: ${scanner.full_name} <-> ${target.full_name}`,
    });
    await Transaction.create({
      scannerId: target.id,
      scannedId: scanner.id,
      points,
      type: 'earn',
      description: `Karsilikli tarama: ${target.full_name} <-> ${scanner.full_name}`,
    });

    return {
      status: 'success',
      message: `Karsilikli tarama tamamlandi! +${points} puan`,
      points,
    };
  }

  // Zaten pending var mi? (ayni yonde)
  const existingPending = await PendingScan.findByPair(scanner.id, target.id);
  if (existingPending) {
    return { status: 'info', message: 'Karsilikli tarama bekleniyor' };
  }

  // Yeni pending olustur
  await PendingScan.create(scanner.id, target.id);

  return {
    status: 'pending',
    message: 'Karsilikli tarama bekleniyor. Karsi tarafin 10 dakika icinde sizi taramasi gerekiyor.',
  };
}

/**
 * Katilimci -> Mentor/Startup onay istegi
 */
async function handleApprovalRequest(participant, approver) {
  // Zaten bekleyen istek var mi?
  const exists = await ApprovalQueue.existsPending(participant.id, approver.id);
  if (exists) {
    return { status: 'info', message: 'Onay bekleniyor' };
  }

  const points = await PointConfig.getByRole(approver.role);

  await ApprovalQueue.create(participant.id, approver.id, points);

  return {
    status: 'pending',
    message: `Onay bekleniyor. ${approver.full_name} onayladiginda ${points} puan kazanacaksiniz.`,
  };
}

module.exports = { processScan };
