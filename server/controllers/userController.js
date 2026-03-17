const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * GET /api/user/profile
 */
async function getProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'not_found', message: 'Kullanıcı bulunamadı' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      totalPoints: user.total_points,
      assignedRoomId: user.assigned_room_id,
      createdAt: user.created_at,
    },
  });
}

/**
 * GET /api/user/transactions
 */
async function getTransactions(req, res) {
  const limit = parseInt(req.query.limit) || 50;
  const transactions = await Transaction.getByUserId(req.user.id, Math.min(limit, 100));
  res.json({ transactions });
}

module.exports = { getProfile, getTransactions };
