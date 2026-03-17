const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const PendingScan = {
  async create(scannerId, scannedId) {
    const id = uuidv4();
    // 10 dakika sonra expire olur
    await db.query(
      `INSERT INTO pending_scans (id, scanner_id, scanned_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [id, scannerId, scannedId]
    );
    return { id };
  },

  /**
   * Ters yonde pending scan bul (B->A var mi? A->B taradiginda kontrol eder)
   */
  async findReverse(scannerId, scannedId) {
    const { rows } = await db.query(
      `SELECT * FROM pending_scans
       WHERE scanner_id = $1 AND scanned_id = $2
       AND completed = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [scannedId, scannerId]
    );
    return rows[0] || null;
  },

  async markCompleted(id) {
    await db.query('UPDATE pending_scans SET completed = TRUE WHERE id = $1', [id]);
  },

  async findByPair(scannerId, scannedId) {
    const { rows } = await db.query(
      `SELECT * FROM pending_scans
       WHERE scanner_id = $1 AND scanned_id = $2
       AND completed = FALSE AND expires_at > NOW()`,
      [scannerId, scannedId]
    );
    return rows[0] || null;
  },
};

module.exports = PendingScan;
