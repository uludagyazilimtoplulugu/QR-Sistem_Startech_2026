const EventSettings = require('../models/EventSettings');
const WhitelistEmail = require('../models/WhitelistEmail');
const Room = require('../models/Room');
const User = require('../models/User');
const PointConfig = require('../models/PointConfig');
const SurpriseCode = require('../models/SurpriseCode');
const Transaction = require('../models/Transaction');
const excelService = require('../services/excelService');
const eventActive = require('../middleware/eventActive');
const { isValidEmail, isValidRole, sanitize } = require('../utils/validators');

// ===================== EVENT =====================

async function getEventStatus(req, res) {
  const settings = await EventSettings.get();
  res.json({ event: settings });
}

async function startEvent(req, res) {
  await EventSettings.start();
  eventActive.resetCache();
  res.json({ message: 'Etkinlik başlatıldı', isActive: true });
}

async function stopEvent(req, res) {
  await EventSettings.stop();
  eventActive.resetCache();
  res.json({ message: 'Etkinlik durduruldu', isActive: false });
}

// ===================== WHITELIST =====================

async function getWhitelist(req, res) {
  const whitelist = await WhitelistEmail.getAll();
  res.json({ whitelist });
}

async function addWhitelist(req, res) {
  const email = sanitize(req.body.email).toLowerCase();
  const role = req.body.role || 'participant';

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Geçerli bir e-posta girin' });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: 'invalid_role', message: 'Geçersiz rol' });
  }

  try {
    const entry = await WhitelistEmail.create(email, role);
    res.status(201).json({ message: 'Eklendi', entry });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'duplicate', message: 'Bu e-posta zaten listede' });
    }
    throw err;
  }
}

async function uploadWhitelistCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'no_file', message: 'CSV dosyası yükleyin' });
  }
  const entries = excelService.parseCSV(req.file.buffer);
  if (entries.length === 0) {
    return res.status(400).json({ error: 'empty_file', message: 'Dosyada geçerli e-posta bulunamadı' });
  }
  const count = await WhitelistEmail.bulkCreate(entries);
  res.json({ message: `${count} e-posta eklendi`, total: entries.length, added: count });
}

async function uploadWhitelistExcel(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'no_file', message: 'Excel dosyası yükleyin' });
  }
  const entries = excelService.parseExcel(req.file.buffer);
  if (entries.length === 0) {
    return res.status(400).json({ error: 'empty_file', message: 'Dosyada geçerli e-posta bulunamadı' });
  }
  const count = await WhitelistEmail.bulkCreate(entries);
  res.json({ message: `${count} e-posta eklendi (participant)`, total: entries.length, added: count });
}

async function deleteWhitelist(req, res) {
  const { id } = req.params;
  const deleted = await WhitelistEmail.deleteById(id);
  if (!deleted) {
    return res.status(404).json({ error: 'not_found', message: 'Kayıt bulunamadı' });
  }
  res.json({ message: 'Silindi' });
}

// ===================== ROOMS =====================

async function getRooms(req, res) {
  const rooms = await Room.getAll();
  // Her oda için atanmış görevliyi de getir
  const roomsWithStaff = await Promise.all(rooms.map(async (room) => {
    const staff = await User.getStaffByRoomId(room.id);
    return { ...room, staff };
  }));
  res.json({ rooms: roomsWithStaff });
}

async function createRoom(req, res) {
  const { name, type, entryLimit, exitPoints } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'missing_fields', message: 'Oda adı ve türü gerekli' });
  }
  if (!['interview', 'case_study'].includes(type)) {
    return res.status(400).json({ error: 'invalid_type', message: 'Geçersiz oda türü' });
  }
  const room = await Room.create({
    name: sanitize(name),
    type,
    entryLimit: parseInt(entryLimit) || 0,
    exitPoints: parseInt(exitPoints) || 0,
  });
  res.status(201).json({ message: 'Oda oluşturuldu', room });
}

async function updateRoom(req, res) {
  const { id } = req.params;
  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({ error: 'not_found', message: 'Oda bulunamadı' });
  }
  await Room.update(id, req.body);
  res.json({ message: 'Oda güncellendi' });
}

async function deleteRoom(req, res) {
  const { id } = req.params;
  const deleted = await Room.deleteById(id);
  if (!deleted) {
    return res.status(404).json({ error: 'not_found', message: 'Oda bulunamadı' });
  }
  res.json({ message: 'Oda silindi' });
}

async function assignStaff(req, res) {
  const { id: roomId } = req.params;
  const { staffId } = req.body;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'not_found', message: 'Oda bulunamadı' });
  }

  const staff = await User.findById(staffId);
  if (!staff || staff.role !== 'gorevli') {
    return res.status(400).json({ error: 'invalid_staff', message: 'Geçersiz görevli' });
  }

  await User.assignRoom(staffId, roomId);
  res.json({ message: `${staff.full_name} odaya atandı` });
}

// ===================== POINT CONFIG =====================

async function getPointConfig(req, res) {
  const config = await PointConfig.getAll();
  res.json({ config });
}

async function updatePointConfig(req, res) {
  const { role, pointsValue } = req.body;
  if (!isValidRole(role)) {
    return res.status(400).json({ error: 'invalid_role', message: 'Geçersiz rol' });
  }
  await PointConfig.update(role, parseInt(pointsValue) || 0);
  res.json({ message: 'Puan değeri güncellendi' });
}

// ===================== SURPRISE CODES =====================

async function getSurpriseCodes(req, res) {
  const codes = await SurpriseCode.getAll();
  res.json({ codes });
}

async function createSurpriseCode(req, res) {
  const { code, pointsValue, count } = req.body;

  if (count && count > 1) {
    // Toplu oluşturma
    const codes = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      const randomCode = generateRandomCode();
      const created = await SurpriseCode.create(randomCode, parseInt(pointsValue) || 10);
      codes.push(created);
    }
    return res.status(201).json({ message: `${codes.length} kod oluşturuldu`, codes });
  }

  if (!code) {
    return res.status(400).json({ error: 'missing_code', message: 'Kod gerekli' });
  }

  try {
    const created = await SurpriseCode.create(code.trim().toUpperCase(), parseInt(pointsValue) || 10);
    res.status(201).json({ message: 'Kod oluşturuldu', code: created });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'duplicate', message: 'Bu kod zaten mevcut' });
    }
    throw err;
  }
}

async function deleteSurpriseCode(req, res) {
  const { id } = req.params;
  const deleted = await SurpriseCode.deleteById(id);
  if (!deleted) {
    return res.status(404).json({ error: 'not_found', message: 'Kod bulunamadı' });
  }
  res.json({ message: 'Kod silindi' });
}

// ===================== TRANSACTIONS & MONITORING =====================

async function getTransactions(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const transactions = await Transaction.getAll(Math.min(limit, 500));
  res.json({ transactions });
}

async function getSuspicious(req, res) {
  const suspicious = await Transaction.getSuspiciousUsers();
  res.json({ suspicious });
}

async function getUsers(req, res) {
  const users = await User.getAll();
  res.json({ users });
}

// ===================== HELPERS =====================

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===================== REGISTRATION CHECK =====================

async function checkRegistration(req, res) {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Geçerli bir e-posta girin' });
  }

  const user = await User.findByEmail(email);
  if (user) {
    return res.json({ status: 'registered', message: 'Kayıtlı kullanıcı', user: { fullName: user.full_name, role: user.role } });
  }

  const wl = await WhitelistEmail.findByEmail(email);
  if (wl) {
    return res.json({ status: 'whitelisted', message: 'Whitelist\'te — henüz kayıt olmamış', role: wl.role });
  }

  res.json({ status: 'not_found', message: 'Bulunamadı' });
}

module.exports = {
  getEventStatus, startEvent, stopEvent,
  getWhitelist, addWhitelist, uploadWhitelistCSV, uploadWhitelistExcel, deleteWhitelist,
  getRooms, createRoom, updateRoom, deleteRoom, assignStaff,
  getPointConfig, updatePointConfig,
  getSurpriseCodes, createSurpriseCode, deleteSurpriseCode,
  getTransactions, getSuspicious, getUsers,
  checkRegistration,
};
