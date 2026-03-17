const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Transaction = {
  async create({ scannerId, scannedId, points, type, roomId, surpriseCodeId, description }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, scanner_id, scanned_id, points, type, room_id, surprise_code_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, scannerId, scannedId || null, points, type, roomId || null, surpriseCodeId || null, description || null]
    );
    return { id };
  },

  async getByUserId(userId, limit = 50) {
    const { rows } = await db.query(
      `SELECT t.*,
              s1.full_name as scanner_name, s1.role as scanner_role,
              s2.full_name as scanned_name, s2.role as scanned_role
       FROM transactions t
       LEFT JOIN users s1 ON t.scanner_id = s1.id
       LEFT JOIN users s2 ON t.scanned_id = s2.id
       WHERE t.scanner_id = $1 OR t.scanned_id = $2
       ORDER BY t.created_at DESC LIMIT $3`,
      [userId, userId, limit]
    );
    return rows;
  },

  async getAll(limit = 100) {
    const { rows } = await db.query(
      `SELECT t.*,
              s1.full_name as scanner_name, s1.role as scanner_role,
              s2.full_name as scanned_name, s2.role as scanned_role
       FROM transactions t
       LEFT JOIN users s1 ON t.scanner_id = s1.id
       LEFT JOIN users s2 ON t.scanned_id = s2.id
       ORDER BY t.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async checkDailyPair(userId1, userId2) {
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE created_at::date = CURRENT_DATE
       AND ((scanner_id = $1 AND scanned_id = $2) OR (scanner_id = $3 AND scanned_id = $4))
       AND type IN ('earn', 'approved')`,
      [userId1, userId2, userId2, userId1]
    );
    return rows[0].count > 0;
  },

  async getSuspiciousUsers() {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, COUNT(*) as scan_count
       FROM transactions t
       JOIN users u ON t.scanner_id = u.id
       WHERE t.created_at > NOW() - INTERVAL '1 hour'
       GROUP BY u.id, u.full_name, u.email
       HAVING COUNT(*) > 15
       ORDER BY scan_count DESC`
    );
    return rows;
  },
};

module.exports = Transaction;
