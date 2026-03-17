const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const ApprovalQueue = {
  async create(participantId, approverId, pointsToAward) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO approval_queue (id, participant_id, approver_id, points_to_award)
       VALUES ($1, $2, $3, $4)`,
      [id, participantId, approverId, pointsToAward]
    );
    return { id };
  },

  async getPendingByApprover(approverId) {
    const { rows } = await db.query(
      `SELECT aq.*, u.full_name as participant_name, u.email as participant_email
       FROM approval_queue aq
       JOIN users u ON aq.participant_id = u.id
       WHERE aq.approver_id = $1 AND aq.status = 'pending'
       ORDER BY aq.created_at DESC`,
      [approverId]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM approval_queue WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async approve(id) {
    await db.query(
      `UPDATE approval_queue SET status = 'approved', resolved_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async reject(id) {
    await db.query(
      `UPDATE approval_queue SET status = 'rejected', resolved_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async existsPending(participantId, approverId) {
    const { rows } = await db.query(
      `SELECT id FROM approval_queue
       WHERE participant_id = $1 AND approver_id = $2 AND status = 'pending'`,
      [participantId, approverId]
    );
    return rows.length > 0;
  },
};

module.exports = ApprovalQueue;
