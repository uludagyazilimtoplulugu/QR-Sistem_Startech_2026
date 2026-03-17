const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const User = require('../models/User');
const WhitelistEmail = require('../models/WhitelistEmail');
const Session = require('../models/Session');
const PasswordReset = require('../models/PasswordReset');
const totpService = require('../services/totpService');
const mailService = require('../services/mailService');
const { isValidEmail, isValidPassword, sanitize } = require('../utils/validators');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const email = sanitize(req.body.email).toLowerCase();
  const password = req.body.password;
  const fullName = sanitize(req.body.fullName);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Geçerli bir e-posta adresi girin' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'invalid_password', message: 'Şifre en az 6 karakter olmalı' });
  }
  if (!fullName || fullName.length < 2) {
    return res.status(400).json({ error: 'invalid_name', message: 'Geçerli bir isim girin' });
  }

  // Whitelist kontrolü
  const whitelisted = await WhitelistEmail.findByEmail(email);
  if (!whitelisted) {
    return res.status(403).json({ error: 'not_whitelisted', message: 'Bu e-posta kayıt listesinde bulunmuyor' });
  }

  // Zaten kayıtlı mı?
  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'already_registered', message: 'Bu e-posta ile zaten kayıt olunmuş' });
  }

  // Kullanıcı oluştur
  const passwordHash = await bcrypt.hash(password, 12);
  const qrSecret = totpService.generateQrSecret();
  const user = await User.create({
    email,
    passwordHash,
    fullName,
    role: whitelisted.role,
    qrSecret,
  });

  // Token oluştur
  const tokens = await generateTokens(user);

  res.status(201).json({
    message: 'Kayıt başarılı',
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    accessToken: tokens.accessToken,
  });
  setRefreshCookie(res, tokens.refreshToken);
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const email = sanitize(req.body.email).toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields', message: 'E-posta ve şifre gerekli' });
  }

  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
  }

  const tokens = await generateTokens(user);

  setRefreshCookie(res, tokens.refreshToken);
  res.json({
    message: 'Giriş başarılı',
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    accessToken: tokens.accessToken,
  });
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await Session.deleteByTokenHash(tokenHash);
  }
  res.clearCookie('refresh_token');
  res.json({ message: 'Çıkış yapıldı' });
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'no_refresh_token', message: 'Oturum bulunamadı' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await Session.findByTokenHash(tokenHash);

    if (!session) {
      return res.status(401).json({ error: 'invalid_session', message: 'Oturum geçersiz' });
    }

    // Eski session'ı sil
    await Session.deleteByTokenHash(tokenHash);

    // Yeni tokenler oluştur
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'user_not_found', message: 'Kullanıcı bulunamadı' });
    }

    const tokens = await generateTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    res.clearCookie('refresh_token');
    return res.status(401).json({ error: 'invalid_refresh_token', message: 'Oturum süresi doldu' });
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  const email = sanitize(req.body.email).toLowerCase();

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Geçerli bir e-posta adresi girin' });
  }

  const user = await User.findByEmail(email);
  if (!user) {
    // Güvenlik: Kullanıcı bulunamasa bile aynı mesajı göster
    return res.json({ message: 'Eğer kayıtlı bir e-posta ise kod gönderildi' });
  }

  // 6 haneli kod oluştur
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordReset.create(user.id, code);

  // E-posta gönder
  await mailService.sendPasswordResetCode(email, code, user.full_name);

  res.json({ message: 'Eğer kayıtlı bir e-posta ise kod gönderildi' });
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  const email = sanitize(req.body.email).toLowerCase();
  const code = sanitize(req.body.code);
  const newPassword = req.body.newPassword;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'missing_fields', message: 'Tüm alanları doldurun' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'invalid_password', message: 'Şifre en az 6 karakter olmalı' });
  }

  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(400).json({ error: 'invalid_code', message: 'Geçersiz veya süresi dolmuş kod' });
  }

  const resetEntry = await PasswordReset.findValidCode(user.id, code);
  if (!resetEntry) {
    return res.status(400).json({ error: 'invalid_code', message: 'Geçersiz veya süresi dolmuş kod' });
  }

  // Şifreyi güncelle
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.updatePassword(user.id, passwordHash);
  await PasswordReset.markUsed(resetEntry.id);

  // Tüm oturumları kapat
  await Session.deleteAllForUser(user.id);

  res.json({ message: 'Şifre başarıyla değiştirildi' });
}

// ============================================================================
// HELPERS
// ============================================================================

async function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  // Session kaydet
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün
  await Session.create(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    path: '/api/auth',
  });
}

module.exports = { register, login, logout, refresh, forgotPassword, resetPassword };
