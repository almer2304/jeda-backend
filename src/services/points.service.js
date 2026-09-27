const { query } = require('../config/database');

/**
 * Add points to a user's balance.
 * @param {string} userId
 * @param {number} amount
 * @param {string} sourceType - 'lock_complete','daily_bonus','weekly_bonus','badge','challenge'
 * @param {string|null} sourceId
 * @param {string} description
 */
async function addPoints(userId, amount, sourceType, sourceId = null, description = '') {
  await query(
    `INSERT INTO points_transactions (user_id, amount, source_type, source_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, amount, sourceType, sourceId, description]
  );
  await query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [amount, userId]);
}

/**
 * Get points transaction history.
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
async function getPointsHistory(userId, limit = 50, offset = 0) {
  const result = await query(
    `SELECT id, amount, source_type, description, created_at
     FROM points_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

module.exports = { addPoints, getPointsHistory };
