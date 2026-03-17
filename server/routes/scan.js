const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const auth = require('../middleware/auth');
const eventActive = require('../middleware/eventActive');
const asyncHandler = require('../utils/asyncHandler');
const { scanLimiter } = require('../middleware/rateLimiter');

router.post('/qr', auth, eventActive, scanLimiter, asyncHandler(scanController.scanQR));
router.post('/manual', auth, eventActive, scanLimiter, asyncHandler(scanController.scanManual));

module.exports = router;

// Ayrıca code route'u da export et (app.js'de ayrı mount edilecek)
module.exports.codeRouter = (() => {
  const codeRouter = express.Router();
  codeRouter.post('/redeem', auth, eventActive, scanLimiter, asyncHandler(scanController.redeemCode));
  return codeRouter;
})();
