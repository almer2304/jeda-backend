const challengeService = require('../services/challenge.service');

async function createChallenge(req, res, next) {
  try {
    const challenge = await challengeService.createChallenge(req.user.id, req.body);
    res.json({ message: 'Challenge berhasil dibuat', challenge });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getGlobalChallenges(req, res, next) {
  try {
    const challenges = await challengeService.getGlobalChallenges();
    res.json({ challenges });
  } catch (error) {
    next(error);
  }
}

async function getMyChallenges(req, res, next) {
  try {
    const challenges = await challengeService.getMyChallenges(req.user.id);
    res.json({ challenges });
  } catch (error) {
    next(error);
  }
}

async function getChallengeDetail(req, res, next) {
  try {
    const { id } = req.params;
    const challenge = await challengeService.getChallengeDetail(id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge tidak ditemukan' });
    }
    res.json({ challenge });
  } catch (error) {
    next(error);
  }
}

async function respondInvite(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const result = await challengeService.respondToInvite(id, req.user.id, action);
    res.json({ message: `Challenge ${action}ed`, participant: result });
  } catch (error) {
    next(error);
  }
}

async function surrender(req, res, next) {
  try {
    const { id } = req.params;
    const result = await challengeService.surrenderChallenge(id, req.user.id);
    res.json({ message: 'Kamu telah menyerah dari challenge', participant: result });
  } catch (error) {
    next(error);
  }
}

async function recordAttempt(req, res, next) {
  try {
    const { id } = req.params;
    const result = await challengeService.recordAttempt(id, req.user.id);
    res.json({ message: 'Attempt berhasil dicatat', result });
  } catch (error) {
    next(error);
  }
}

async function joinChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await challengeService.joinChallenge(id, req.user.id);
    res.json({ message: 'Berhasil bergabung ke tantangan', participant: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createChallenge,
  getGlobalChallenges,
  getMyChallenges,
  getChallengeDetail,
  respondInvite,
  joinChallenge,
  surrender,
  recordAttempt,
};
