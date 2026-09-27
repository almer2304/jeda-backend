const { query } = require('../config/database');
const { checkAndAwardBadges, getUserStats } = require('../utils/badge-checker');

/**
 * Get all available badges with user's earned status.
 * @param {string|null} userId - If provided, marks which badges the user has earned.
 * @returns {Promise<Array>}
 */
async function getAllBadges(userId = null) {
  if (!userId) {
    const result = await query('SELECT * FROM badges ORDER BY rarity DESC, name ASC');
    return result.rows;
  }

  const result = await query(
    `SELECT b.*, ub.earned_at,
       CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as is_earned
     FROM badges b
     LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
     ORDER BY is_earned DESC, b.rarity DESC, b.name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get only the badges a user has earned.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserBadges(userId) {
  const result = await query(
    `SELECT b.code, b.name, b.description, b.icon_url, b.category, b.rarity, b.points_reward, ub.earned_at
     FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
     WHERE ub.user_id = $1
     ORDER BY ub.earned_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Trigger a badge check for a user and return any newly awarded badges.
 * @param {string} userId
 * @returns {Promise<Array>} Newly awarded badges
 */
async function triggerBadgeCheck(userId) {
  const stats = await getUserStats(userId);
  return checkAndAwardBadges(userId, stats);
}

module.exports = { getAllBadges, getUserBadges, triggerBadgeCheck };
