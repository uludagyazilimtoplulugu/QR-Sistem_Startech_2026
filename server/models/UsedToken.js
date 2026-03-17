const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const UsedToken = {
  async isUsed(tokenHash) {
    const { rows } = await db.query(
      'SELECT id FROM used_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return rows.length > 0;
  },

  async markUsed(tokenHash, userId) {
    const id = uuidv4();
    try {
      await db.query(
        'INSERT INTO used_tokens (id, token_hash, user_id) VALUES ($1, $2, $3)',
        [id, tokenHash, userId]
      );
      return true;
    } catch (err) {
      // Duplicate key = already used
      if (err.code === '23505') return false;
      throw err;
    }
  },
};

module.exports = UsedToken;
