const User = require('../models/User');

/**
 * GET /api/leaderboard
 */
async function getLeaderboard(req, res) {
  const participants = await User.getLeaderboard();
  const mentorsAndStartups = await User.getMentorsAndStartups();

  res.json({
    participants,
    mentorsAndStartups,
  });
}

module.exports = { getLeaderboard };
