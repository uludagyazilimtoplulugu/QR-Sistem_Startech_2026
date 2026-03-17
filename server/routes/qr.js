const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/generate', auth, asyncHandler(qrController.generate));

module.exports = router;
