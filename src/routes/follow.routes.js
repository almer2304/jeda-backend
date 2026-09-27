const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { authenticate } = require('../middleware/auth');

router.post('/:userId', authenticate, followController.follow);
router.delete('/:userId', authenticate, followController.unfollow);
router.get('/friends', authenticate, followController.getFriends);
router.get('/followers', authenticate, followController.getFollowers);
router.get('/following', authenticate, followController.getFollowing);

module.exports = router;
