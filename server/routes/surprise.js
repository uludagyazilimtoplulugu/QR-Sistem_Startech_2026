const express = require('express');
const router = express.Router();
const surpriseController = require('../controllers/surpriseController');
const auth = require('../middleware/auth');
const eventActive = require('../middleware/eventActive');
const roleGuard = require('../middleware/roleGuard');
const asyncHandler = require('../utils/asyncHandler');

router.post('/redeem', auth, eventActive, roleGuard('participant'), asyncHandler(surpriseController.redeem));

module.exports = router;
