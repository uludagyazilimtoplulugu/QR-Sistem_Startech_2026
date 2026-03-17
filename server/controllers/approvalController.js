const ApprovalQueue = require('../models/ApprovalQueue');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * GET /api/approval/pending
 */
async function getPending(req, res) {
  const pending = await ApprovalQueue.getPendingByApprover(req.user.id);
  res.json({ pending });
}

/**
 * POST /api/approval/:id/approve
 */
async function approve(req, res) {
  const { id } = req.params;

  const entry = await ApprovalQueue.findById(id);
  if (!entry) {
    return res.status(404).json({ error: 'not_found', message: 'Onay isteği bulunamadı' });
  }

  if (entry.approver_id !== req.user.id) {
    return res.status(403).json({ error: 'forbidden', message: 'Bu isteği onaylama yetkiniz yok' });
  }

  if (entry.status !== 'pending') {
    return res.status(400).json({ error: 'already_resolved', message: 'Bu istek zaten işlendi' });
  }

  // Onayla
  await ApprovalQueue.approve(id);

  // Puan ver
  await User.updatePoints(entry.participant_id, entry.points_to_award);

  // Transaction kaydi
  const participant = await User.findById(entry.participant_id);
  const approver = await User.findById(entry.approver_id);

  await Transaction.create({
    scannerId: entry.participant_id,
    scannedId: entry.approver_id,
    points: entry.points_to_award,
    type: 'approved',
    description: `${approver.full_name} (${approver.role}) tarafından onaylandı`,
  });

  res.json({
    status: 'success',
    message: `${participant.full_name} için ${entry.points_to_award} puan onaylandı`,
    points: entry.points_to_award,
  });
}

/**
 * POST /api/approval/:id/reject
 */
async function reject(req, res) {
  const { id } = req.params;

  const entry = await ApprovalQueue.findById(id);
  if (!entry) {
    return res.status(404).json({ error: 'not_found', message: 'Onay isteği bulunamadı' });
  }

  if (entry.approver_id !== req.user.id) {
    return res.status(403).json({ error: 'forbidden', message: 'Bu isteği reddetme yetkiniz yok' });
  }

  if (entry.status !== 'pending') {
    return res.status(400).json({ error: 'already_resolved', message: 'Bu istek zaten işlendi' });
  }

  await ApprovalQueue.reject(id);

  res.json({ status: 'success', message: 'İstek reddedildi' });
}

module.exports = { getPending, approve, reject };
