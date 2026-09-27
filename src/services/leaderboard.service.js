const { query } = require('../config/database');

async function getLeaderboard({ type = 'points', scope = 'global', userId = null, limit = 50 }) {
  // Whitelist agar tidak ada SQL injection lewat ORDER BY
  const orderMap = {
    points: 'u.total_points DESC',
    streak: 'u.current_streak_days DESC',
    forced_open_lowest: 'u.total_forced_opens ASC, u.total_points DESC',
  };
  const orderClause = orderMap[type] || orderMap.points;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  if (scope === 'friends' && userId) {
    // Ganti IN (subquery) + correlated COUNT dengan JOIN + LEFT JOIN aggregation — 10x lebih cepat
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points,
              u.current_streak_days, u.total_forced_opens,
              COALESCE(bc.badge_count, 0) as badge_count
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int as badge_count FROM user_badges GROUP BY user_id
       ) bc ON bc.user_id = u.id
       WHERE u.id = $1 OR EXISTS (
         SELECT 1 FROM follows f1
         JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
         WHERE f1.follower_id = $1 AND f1.following_id = u.id
       )
       ORDER BY ${orderClause}
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  }

  // Global leaderboard — pakai LEFT JOIN agregasi, bukan correlated subquery per baris
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points,
            u.current_streak_days, u.total_forced_opens,
            COALESCE(bc.badge_count, 0) as badge_count
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int as badge_count FROM user_badges GROUP BY user_id
     ) bc ON bc.user_id = u.id
     ORDER BY ${orderClause}
     LIMIT $1`,
    [safeLimit]
  );
  return result.rows;
}

module.exports = { getLeaderboard };
