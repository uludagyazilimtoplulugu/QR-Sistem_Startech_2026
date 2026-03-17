const db = require('../config/database');

const EventSettings = {
  async get() {
    const { rows } = await db.query('SELECT * FROM event_settings WHERE id = 1');
    return rows[0] || { id: 1, is_active: false, event_name: 'Etkinlik 2026' };
  },

  async start() {
    await db.query(
      'UPDATE event_settings SET is_active = TRUE, started_at = NOW(), stopped_at = NULL WHERE id = 1'
    );
  },

  async stop() {
    await db.query(
      'UPDATE event_settings SET is_active = FALSE, stopped_at = NOW() WHERE id = 1'
    );
  },

  async updateName(name) {
    await db.query('UPDATE event_settings SET event_name = $1 WHERE id = 1', [name]);
  },
};

module.exports = EventSettings;
