const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Room = {
  async create({ name, type, entryLimit, exitPoints }) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO rooms (id, name, type, entry_limit, exit_points) VALUES ($1, $2, $3, $4, $5)',
      [id, name, type, entryLimit, exitPoints]
    );
    return { id, name, type, entryLimit, exitPoints };
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async getAll() {
    const { rows } = await db.query('SELECT * FROM rooms ORDER BY created_at DESC');
    return rows;
  },

  async getActive() {
    const { rows } = await db.query('SELECT * FROM rooms WHERE is_active = TRUE ORDER BY name');
    return rows;
  },

  async update(id, fields) {
    const sets = [];
    const values = [];
    let paramIndex = 1;
    if (fields.name !== undefined) { sets.push(`name = $${paramIndex++}`); values.push(fields.name); }
    if (fields.type !== undefined) { sets.push(`type = $${paramIndex++}`); values.push(fields.type); }
    if (fields.entryLimit !== undefined) { sets.push(`entry_limit = $${paramIndex++}`); values.push(fields.entryLimit); }
    if (fields.exitPoints !== undefined) { sets.push(`exit_points = $${paramIndex++}`); values.push(fields.exitPoints); }
    if (fields.isActive !== undefined) { sets.push(`is_active = $${paramIndex++}`); values.push(fields.isActive); }
    if (sets.length === 0) return;
    values.push(id);
    await db.query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $${paramIndex}`, values);
  },

  async deleteById(id) {
    const result = await db.query('DELETE FROM rooms WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

module.exports = Room;
