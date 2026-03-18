const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncHandler = require('../utils/asyncHandler');

// Görevli ve admin erişebilir
router.use(auth, roleGuard('kayit_gorevli', 'admin'));

router.get('/check', asyncHandler(adminController.checkRegistration));
router.post('/add', asyncHandler(adminController.addWhitelist));

module.exports = router;
