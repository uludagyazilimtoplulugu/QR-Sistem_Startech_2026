const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const Session = {
  async create(userId, refreshToken, expiresAt) {
    const id = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.query(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [id, userId, tokenHash, expiresAt]
    );
    return { id, tokenHash };
  },

  async findByTokenHash(tokenHash) {
    const { rows } = await db.query(
      'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    return rows[0] || null;
  },

  async deleteByTokenHash(tokenHash) {
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  },

  async deleteAllForUser(userId) {
    await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },
};

module.exports = Session;
