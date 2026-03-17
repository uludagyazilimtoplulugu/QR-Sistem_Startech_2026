const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const User = {
  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create({ email, passwordHash, fullName, role, qrSecret }) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO users (id, email, password_hash, full_name, role, qr_secret) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, email, passwordHash, fullName, role, qrSecret]
    );
    return { id, email, fullName, role };
  },

  async updatePoints(id, pointsDelta) {
    await db.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [pointsDelta, id]
    );
  },

  async setPoints(id, points) {
    await db.query('UPDATE users SET total_points = $1 WHERE id = $2', [points, id]);
  },

  async updatePassword(id, passwordHash) {
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  },

  async assignRoom(userId, roomId) {
    await db.query('UPDATE users SET assigned_room_id = $1 WHERE id = $2', [roomId, userId]);
  },

  async getLeaderboard() {
    const { rows } = await db.query(
      'SELECT id, full_name, email, role, total_points FROM users WHERE role = $1 ORDER BY total_points DESC',
      ['participant']
    );
    return rows;
  },

  async getMentorsAndStartups() {
    const { rows } = await db.query(
      'SELECT id, full_name, email, role, total_points FROM users WHERE role IN ($1, $2) ORDER BY role, full_name',
      ['mentor', 'startup']
    );
    return rows;
  },

  async getAll() {
    const { rows } = await db.query(
      'SELECT id, full_name, email, role, total_points, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  async getStaffByRoomId(roomId) {
    const { rows } = await db.query(
      'SELECT id, full_name, email FROM users WHERE role = $1 AND assigned_room_id = $2',
      ['gorevli', roomId]
    );
    return rows;
  },

  async countScansByUserInLastHour(userId) {
    const { rows } = await db.query(
      "SELECT COUNT(*) as count FROM transactions WHERE scanner_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
      [userId]
    );
    return rows[0].count;
  },
};

module.exports = User;
