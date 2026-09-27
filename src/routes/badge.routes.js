const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badge.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, badgeController.getAllBadges);
router.get('/my', authenticate, badgeController.getMyBadges);
router.post('/check', authenticate, badgeController.checkBadges);

module.exports = router;
