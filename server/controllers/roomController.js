const Room = require('../models/Room');
const roomService = require('../services/roomService');
const totpService = require('../services/totpService');
const User = require('../models/User');

/**
 * GET /api/rooms/list
 */
async function listRooms(req, res) {
  const rooms = await Room.getActive();
  res.json({ rooms });
}

/**
 * POST /api/rooms/enter
 * Body: { qrContent, roomId } or { userId, shortCode, roomId }
 */
async function enterRoom(req, res) {
  const { qrContent, userId, shortCode, roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'missing_room', message: 'Oda seçimi gerekli' });
  }

  let participantId;

  if (qrContent) {
    const parsed = totpService.parseQrContent(qrContent);
    if (!parsed) {
      return res.status(400).json({ error: 'invalid_qr', message: 'Geçersiz QR kod' });
    }
    // Token doğrula
    const target = await User.findById(parsed.userId);
    if (!target) {
      return res.status(400).json({ error: 'user_not_found', message: 'Kullanıcı bulunamadı' });
    }
    const isValid = totpService.verifyToken(target.qr_secret, parsed.token);
    if (!isValid) {
      return res.status(400).json({ error: 'invalid_token', message: 'QR kod geçersiz veya süresi dolmuş' });
    }
    participantId = parsed.userId;
  } else if (userId && shortCode) {
    const target = await User.findById(userId);
    if (!target) {
      return res.status(400).json({ error: 'user_not_found', message: 'Kullanıcı bulunamadı' });
    }
    const isValid = totpService.verifyToken(target.qr_secret, shortCode);
    if (!isValid) {
      return res.status(400).json({ error: 'invalid_code', message: 'Kod geçersiz veya süresi dolmuş' });
    }
    participantId = userId;
  } else {
    return res.status(400).json({ error: 'missing_fields', message: 'QR kod veya kısa kod gerekli' });
  }

  const result = await roomService.processRoomEntry(req.user.id, participantId, roomId);
  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

/**
 * POST /api/rooms/exit
 * Body: { participantId, roomId }
 */
async function exitRoom(req, res) {
  const { participantId, roomId } = req.body;

  if (!participantId || !roomId) {
    return res.status(400).json({ error: 'missing_fields', message: 'Katılımcı ve oda gerekli' });
  }

  const result = await roomService.processRoomExit(req.user.id, participantId, roomId);
  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

/**
 * GET /api/rooms/active-participants
 * Görevlinin odasındaki aktif katılımcılar
 */
async function getActiveParticipants(req, res) {
  const RoomEntry = require('../models/RoomEntry');
  const staff = await User.findById(req.user.id);
  if (!staff || !staff.assigned_room_id) {
    return res.status(400).json({ error: 'no_room', message: 'Size atanmış oda yok' });
  }
  const participants = await RoomEntry.getActiveByRoom(staff.assigned_room_id);
  res.json({ participants, roomId: staff.assigned_room_id });
}

module.exports = { listRooms, enterRoom, exitRoom, getActiveParticipants };
