const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const auth = require('../middleware/auth');
const eventActive = require('../middleware/eventActive');
const roleGuard = require('../middleware/roleGuard');
const asyncHandler = require('../utils/asyncHandler');

router.get('/list', auth, asyncHandler(roomController.listRooms));
router.post('/enter', auth, eventActive, roleGuard('gorevli', 'admin'), asyncHandler(roomController.enterRoom));
router.post('/exit', auth, eventActive, roleGuard('gorevli', 'admin'), asyncHandler(roomController.exitRoom));
router.get('/active-participants', auth, roleGuard('gorevli', 'admin'), asyncHandler(roomController.getActiveParticipants));

module.exports = router;
