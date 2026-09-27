const badgeService = require('../services/badge.service');

async function getAllBadges(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const badges = await badgeService.getAllBadges(userId);
    res.json({ badges });
  } catch (error) {
    next(error);
  }
}

async function getMyBadges(req, res, next) {
  try {
    const badges = await badgeService.getUserBadges(req.user.id);
    res.json({ badges });
  } catch (error) {
    next(error);
  }
}

async function checkBadges(req, res, next) {
  try {
    const newBadges = await badgeService.triggerBadgeCheck(req.user.id);
    res.json({ message: 'Badge check selesai', new_badges: newBadges });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllBadges, getMyBadges, checkBadges };
