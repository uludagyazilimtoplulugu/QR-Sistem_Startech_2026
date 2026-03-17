const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(authController.resetPassword));

module.exports = router;
