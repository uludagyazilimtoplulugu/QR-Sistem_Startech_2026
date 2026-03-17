const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncHandler = require('../utils/asyncHandler');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Tum admin route'lari auth + admin rolu gerektirir
router.use(auth, roleGuard('admin'));

// Event
router.get('/event/status', asyncHandler(adminController.getEventStatus));
router.post('/event/start', asyncHandler(adminController.startEvent));
router.post('/event/stop', asyncHandler(adminController.stopEvent));

// Whitelist
router.get('/whitelist', asyncHandler(adminController.getWhitelist));
router.post('/whitelist', asyncHandler(adminController.addWhitelist));
router.post('/whitelist/csv', upload.single('file'), asyncHandler(adminController.uploadWhitelistCSV));
router.post('/whitelist/excel', upload.single('file'), asyncHandler(adminController.uploadWhitelistExcel));
router.delete('/whitelist/:id', asyncHandler(adminController.deleteWhitelist));

// Rooms
router.get('/rooms', asyncHandler(adminController.getRooms));
router.post('/rooms', asyncHandler(adminController.createRoom));
router.put('/rooms/:id', asyncHandler(adminController.updateRoom));
router.delete('/rooms/:id', asyncHandler(adminController.deleteRoom));
router.put('/rooms/:id/staff', asyncHandler(adminController.assignStaff));

// Point Config
router.get('/point-config', asyncHandler(adminController.getPointConfig));
router.put('/point-config', asyncHandler(adminController.updatePointConfig));

// Surprise Codes
router.get('/surprise-codes', asyncHandler(adminController.getSurpriseCodes));
router.post('/surprise-codes', asyncHandler(adminController.createSurpriseCode));
router.delete('/surprise-codes/:id', asyncHandler(adminController.deleteSurpriseCode));

// Monitoring
router.get('/transactions', asyncHandler(adminController.getTransactions));
router.get('/suspicious', asyncHandler(adminController.getSuspicious));
router.get('/users', asyncHandler(adminController.getUsers));

module.exports = router;
