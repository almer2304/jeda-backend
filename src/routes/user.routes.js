const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/search', authenticate, userController.searchUsers);
router.get('/:id/profile', optionalAuth, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.post('/me/sync-locks', authenticate, userController.syncLocks);
router.post('/me/report-forced-open', authenticate, userController.reportForcedOpen);

module.exports = router;
