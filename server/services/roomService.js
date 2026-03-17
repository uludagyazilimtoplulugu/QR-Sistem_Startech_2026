const Room = require('../models/Room');
const RoomEntry = require('../models/RoomEntry');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Katilimciyi odaya al
 */
async function processRoomEntry(staffId, participantId, roomId) {
  // Staff kontrolu
  const staff = await User.findById(staffId);
  if (!staff || staff.role !== 'gorevli') {
    return { status: 'error', message: 'Sadece gorevliler oda girisi yapabilir' };
  }

  // Staff'in atandigi oda kontrolu
  if (staff.assigned_room_id !== roomId) {
    return { status: 'error', message: 'Bu oda size atanmamis' };
  }

  // Oda kontrolu
  const room = await Room.findById(roomId);
  if (!room) {
    return { status: 'error', message: 'Oda bulunamadi' };
  }
  if (!room.is_active) {
    return { status: 'error', message: 'Oda su an aktif degil' };
  }

  // Katilimci kontrolu
  const participant = await User.findById(participantId);
  if (!participant) {
    return { status: 'error', message: 'Katilimci bulunamadi' };
  }
  if (participant.role !== 'participant') {
    return { status: 'error', message: 'Sadece katilimcilar odalara girebilir' };
  }

  // Zaten odada mi?
  const activeEntry = await RoomEntry.getActiveEntry(participantId, roomId);
  if (activeEntry) {
    return { status: 'warning', message: 'Katilimci zaten bu odada' };
  }

  // Giris limiti hesapla (doubling)
  const previousEntries = await RoomEntry.getEntryCount(participantId, roomId);
  const requiredPoints = room.entry_limit * Math.pow(2, previousEntries);

  if (participant.total_points < requiredPoints) {
    return {
      status: 'error',
      message: `Yetersiz puan. Gerekli: ${requiredPoints}, Mevcut: ${participant.total_points}`,
      required: requiredPoints,
      current: participant.total_points,
    };
  }

  // Girisi kaydet (puan dusulmez!)
  const entryNumber = previousEntries + 1;
  await RoomEntry.create(participantId, roomId, entryNumber);

  return {
    status: 'success',
    message: `${participant.full_name} odaya alindi (${entryNumber}. giris)`,
    entryNumber,
    nextRequiredPoints: room.entry_limit * Math.pow(2, entryNumber),
  };
}

/**
 * Katilimci odayi tamamladi
 */
async function processRoomExit(staffId, participantId, roomId) {
  // Staff kontrolu
  const staff = await User.findById(staffId);
  if (!staff || staff.role !== 'gorevli') {
    return { status: 'error', message: 'Sadece gorevliler bu islemi yapabilir' };
  }

  if (staff.assigned_room_id !== roomId) {
    return { status: 'error', message: 'Bu oda size atanmamis' };
  }

  // Oda kontrolu
  const room = await Room.findById(roomId);
  if (!room) {
    return { status: 'error', message: 'Oda bulunamadi' };
  }

  // Aktif giris bul
  const activeEntry = await RoomEntry.getActiveEntry(participantId, roomId);
  if (!activeEntry) {
    return { status: 'error', message: 'Bu katilimcinin aktif oda girisi yok' };
  }

  // Tamamla ve puan ver
  await RoomEntry.completeEntry(activeEntry.id, room.exit_points);
  await User.updatePoints(participantId, room.exit_points);

  // Transaction kaydi
  const participant = await User.findById(participantId);
  await Transaction.create({
    scannerId: participantId,
    scannedId: staffId,
    points: room.exit_points,
    type: 'room_exit',
    roomId,
    description: `${room.name} odasi tamamlandi (+${room.exit_points} puan)`,
  });

  return {
    status: 'success',
    message: `${participant.full_name} odayi tamamladi! +${room.exit_points} puan`,
    points: room.exit_points,
  };
}

module.exports = { processRoomEntry, processRoomExit };
