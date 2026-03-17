const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/profile', auth, asyncHandler(userController.getProfile));
router.get('/transactions', auth, asyncHandler(userController.getTransactions));

module.exports = router;
