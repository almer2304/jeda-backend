const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.post('/', authenticate, challengeController.createChallenge);
router.get('/global', optionalAuth, challengeController.getGlobalChallenges);

router.get('/my', authenticate, challengeController.getMyChallenges);
router.get('/:id', authenticate, challengeController.getChallengeDetail);
router.post('/:id/join', authenticate, challengeController.joinChallenge);
router.post('/:id/respond', authenticate, challengeController.respondInvite);
router.post('/:id/surrender', authenticate, challengeController.surrender);
router.post('/:id/attempt', authenticate, challengeController.recordAttempt);

module.exports = router;
