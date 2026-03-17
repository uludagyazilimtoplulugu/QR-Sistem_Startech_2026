const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const RoomEntry = {
  async getEntryCount(userId, roomId) {
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM room_entries WHERE user_id = $1 AND room_id = $2 AND completed = TRUE',
      [userId, roomId]
    );
    return rows[0].count;
  },

  async getActiveEntry(userId, roomId) {
    const { rows } = await db.query(
      'SELECT * FROM room_entries WHERE user_id = $1 AND room_id = $2 AND exited_at IS NULL LIMIT 1',
      [userId, roomId]
    );
    return rows[0] || null;
  },

  async create(userId, roomId, entryNumber) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO room_entries (id, user_id, room_id, entry_number) VALUES ($1, $2, $3, $4)',
      [id, userId, roomId, entryNumber]
    );
    return { id };
  },

  async completeEntry(id, pointsAwarded) {
    await db.query(
      'UPDATE room_entries SET exited_at = NOW(), completed = TRUE, points_awarded = $1 WHERE id = $2',
      [pointsAwarded, id]
    );
  },

  async getByRoom(roomId) {
    const { rows } = await db.query(
      `SELECT re.*, u.full_name, u.email
       FROM room_entries re
       JOIN users u ON re.user_id = u.id
       WHERE re.room_id = $1
       ORDER BY re.entered_at DESC`,
      [roomId]
    );
    return rows;
  },

  async getActiveByRoom(roomId) {
    const { rows } = await db.query(
      `SELECT re.id as entry_id, re.user_id, re.entry_number, re.entered_at, u.full_name, u.email
       FROM room_entries re
       JOIN users u ON re.user_id = u.id
       WHERE re.room_id = $1 AND re.exited_at IS NULL
       ORDER BY re.entered_at ASC`,
      [roomId]
    );
    return rows;
  },
};

module.exports = RoomEntry;
