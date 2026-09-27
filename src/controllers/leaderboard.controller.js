const leaderboardService = require('../services/leaderboard.service');

async function getLeaderboard(req, res, next) {
  try {
    const { type = 'points', scope = 'global', limit = 50 } = req.query;
    const userId = req.user ? req.user.id : null;

    const leaderboard = await leaderboardService.getLeaderboard({
      type,
      scope,
      userId,
      limit: parseInt(limit, 10),
    });

    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
}

module.exports = { getLeaderboard };
