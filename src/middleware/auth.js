const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { evaluateAndUpdateStreak } = require('../services/user.service');

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header,
 * then attaches the user object to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Evaluate streak before reading user stats
    await evaluateAndUpdateStreak(decoded.userId);

    // Fetch user from database to ensure they still exist
    const result = await query(
      `SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.bio, u.is_email_verified,
              u.total_points, u.total_forced_opens, u.longest_streak_days, u.current_streak_days, u.created_at,
              (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) as followers_count,
              (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) as following_count
       FROM users u WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
    next(error);
  }
}

/**
 * Optional auth — if token is present, attach user. If not, continue without user.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.bio, u.is_email_verified,
              u.total_points, u.total_forced_opens, u.longest_streak_days, u.current_streak_days, u.created_at,
              (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) as followers_count,
              (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) as following_count
       FROM users u WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
    next();
  } catch {
    next();
  }
}

/**
 * Generate a JWT token for a user.
 * @param {string} userId - The user's UUID
 * @returns {string} JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

module.exports = { authenticate, optionalAuth, generateToken };
