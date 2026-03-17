const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', auth, asyncHandler(leaderboardController.getLeaderboard));

module.exports = router;
