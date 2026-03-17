const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const SurpriseCode = {
  async create(code, pointsValue) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO surprise_codes (id, code, points_value) VALUES ($1, $2, $3)',
      [id, code, pointsValue]
    );
    return { id, code, pointsValue };
  },

  async findByCode(code) {
    const { rows } = await db.query('SELECT * FROM surprise_codes WHERE code = $1', [code]);
    return rows[0] || null;
  },

  async markUsed(id, userId) {
    await db.query(
      'UPDATE surprise_codes SET is_used = TRUE, used_by = $1, used_at = NOW() WHERE id = $2',
      [userId, id]
    );
  },

  async getAll() {
    const { rows } = await db.query(
      `SELECT sc.*, u.full_name as used_by_name
       FROM surprise_codes sc
       LEFT JOIN users u ON sc.used_by = u.id
       ORDER BY sc.created_at DESC`
    );
    return rows;
  },

  async deleteById(id) {
    const result = await db.query('DELETE FROM surprise_codes WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

module.exports = SurpriseCode;
