const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const auth = require('../middleware/auth');
const eventActive = require('../middleware/eventActive');
const roleGuard = require('../middleware/roleGuard');
const asyncHandler = require('../utils/asyncHandler');

router.get('/pending', auth, roleGuard('mentor', 'startup'), asyncHandler(approvalController.getPending));
router.post('/:id/approve', auth, eventActive, roleGuard('mentor', 'startup'), asyncHandler(approvalController.approve));
router.post('/:id/reject', auth, eventActive, roleGuard('mentor', 'startup'), asyncHandler(approvalController.reject));

module.exports = router;
