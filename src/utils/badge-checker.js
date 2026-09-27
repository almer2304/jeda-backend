const { query } = require('../config/database');

/**
 * Badge definitions and their automatic check logic.
 * Each badge has a `check` function that receives user stats and returns true if earned.
 */
const BADGE_CHECKS = {
  // Streak badges
  streak_7: (stats) => stats.current_streak_days >= 7,
  streak_30: (stats) => stats.current_streak_days >= 30,
  streak_365: (stats) => stats.current_streak_days >= 365,

  // Discipline badges (no forced open)
  no_force_7: (stats) => stats.days_without_forced_open >= 7,
  no_force_30: (stats) => stats.days_without_forced_open >= 30,
  no_force_365: (stats) => stats.days_without_forced_open >= 365,

  // Lock completion badges
  first_lock: (stats) => stats.total_locks_completed >= 1,
  locks_10: (stats) => stats.total_locks_completed >= 10,
  locks_100: (stats) => stats.total_locks_completed >= 100,

  // Social badges
  first_friend: (stats) => stats.mutual_friends_count >= 1,
  friends_10: (stats) => stats.mutual_friends_count >= 10,

  // Challenge badges
  first_challenge: (stats) => stats.challenges_completed >= 1,
  challenge_win_5: (stats) => stats.challenges_won >= 5,
  challenge_win_25: (stats) => stats.challenges_won >= 25,

  // Points milestones
  points_1000: (stats) => stats.total_points >= 1000,
  points_10000: (stats) => stats.total_points >= 10000,
};

/**
 * Check and award all eligible badges for a user.
 * @param {string} userId - User UUID
 * @param {object} stats - Aggregated user stats
 * @returns {Promise<Array<{code: string, name: string}>>} Newly awarded badges
 */
async function checkAndAwardBadges(userId, stats) {
  const newBadges = [];

  // Get badges the user already has
  const existingResult = await query(
    `SELECT b.code FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = $1`,
    [userId]
  );
  const existingCodes = new Set(existingResult.rows.map((r) => r.code));

  for (const [code, checkFn] of Object.entries(BADGE_CHECKS)) {
    if (existingCodes.has(code)) continue;
    if (!checkFn(stats)) continue;

    // Award the badge
    const badgeResult = await query('SELECT id, name, points_reward FROM badges WHERE code = $1', [code]);
    if (badgeResult.rows.length === 0) continue;

    const badge = badgeResult.rows[0];

    await query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, badge.id]);

    // Award points reward if any
    if (badge.points_reward > 0) {
      await query(
        `INSERT INTO points_transactions (user_id, amount, source_type, source_id, description)
         VALUES ($1, $2, 'badge', $3, $4)`,
        [userId, badge.points_reward, badge.id, `Badge diraih: ${badge.name}`]
      );
      await query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [badge.points_reward, userId]);
    }

    newBadges.push({ code, name: badge.name });
  }

  return newBadges;
}

/**
 * Gather aggregated stats for a user (used by badge checker).
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUserStats(userId) {
  // Gabungkan 6 round-trip jadi 1x parallel (4 query independen) + 1 conditional
  const [userResult, locksResult, friendsResult, challengesResult, lastForcedResult] = await Promise.all([
    query('SELECT total_points, current_streak_days, total_forced_opens, created_at FROM users WHERE id = $1', [userId]),
    query(`SELECT COUNT(*) as count FROM locked_apps WHERE user_id = $1 AND is_active = false AND points_claimed = true`, [userId]),
    query(
      `SELECT COUNT(*) as count FROM follows f1
       JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
       WHERE f1.follower_id = $1`,
      [userId]
    ),
    query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'completed' AND forced_open_count = 0) as won
       FROM challenge_participants WHERE user_id = $1`,
      [userId]
    ),
    query(`SELECT opened_at FROM forced_opens WHERE user_id = $1 ORDER BY opened_at DESC LIMIT 1`, [userId]),
  ]);

  const user = userResult.rows[0] || {};
  let daysWithoutForcedOpen = 0;
  if (lastForcedResult.rows.length === 0) {
    const created = user.created_at ? new Date(user.created_at) : new Date();
    daysWithoutForcedOpen = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const lastForced = new Date(lastForcedResult.rows[0].opened_at);
    daysWithoutForcedOpen = Math.floor((Date.now() - lastForced.getTime()) / (1000 * 60 * 60 * 24));
  }

  const cr = challengesResult.rows[0] || {};

  return {
    total_points: user.total_points || 0,
    current_streak_days: user.current_streak_days || 0,
    total_forced_opens: user.total_forced_opens || 0,
    days_without_forced_open: daysWithoutForcedOpen,
    total_locks_completed: parseInt(locksResult.rows[0]?.count || '0', 10),
    mutual_friends_count: parseInt(friendsResult.rows[0]?.count || '0', 10),
    challenges_completed: parseInt(cr.completed || '0', 10),
    challenges_won: parseInt(cr.won || '0', 10),
  };
}

module.exports = { checkAndAwardBadges, getUserStats, BADGE_CHECKS };
