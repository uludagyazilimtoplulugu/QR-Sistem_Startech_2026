const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const PasswordReset = {
  async create(userId, code) {
    const id = uuidv4();
    // 15 dakika gecerlilik
    await db.query(
      `INSERT INTO password_resets (id, user_id, code, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [id, userId, code]
    );
    return { id };
  },

  async findValidCode(userId, code) {
    const { rows } = await db.query(
      `SELECT * FROM password_resets
       WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await db.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
  },
};

module.exports = PasswordReset;
