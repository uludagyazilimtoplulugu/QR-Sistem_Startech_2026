const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const WhitelistEmail = {
  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM whitelist_emails WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async create(email, role = 'participant') {
    const id = uuidv4();
    await db.query(
      'INSERT INTO whitelist_emails (id, email, role) VALUES ($1, $2, $3)',
      [id, email, role]
    );
    return { id, email, role };
  },

  async bulkCreate(entries) {
    if (!entries.length) return 0;
    const values = [];
    const params = [];
    entries.forEach((e, i) => {
      const offset = i * 3;
      values.push(`($${offset+1}, $${offset+2}, $${offset+3})`);
      params.push(uuidv4(), e.email, e.role || 'participant');
    });
    const result = await db.query(
      `INSERT INTO whitelist_emails (id, email, role) VALUES ${values.join(', ')} ON CONFLICT (email) DO NOTHING`,
      params
    );
    return result.rowCount;
  },

  async getAll() {
    const { rows } = await db.query('SELECT * FROM whitelist_emails ORDER BY created_at DESC');
    return rows;
  },

  async deleteById(id) {
    const result = await db.query('DELETE FROM whitelist_emails WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async deleteByEmail(email) {
    const result = await db.query('DELETE FROM whitelist_emails WHERE email = $1', [email]);
    return result.rowCount > 0;
  },
};

module.exports = WhitelistEmail;
