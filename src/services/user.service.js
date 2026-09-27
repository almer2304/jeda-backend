const { query } = require('../config/database');
const { calculateLockCompletionPoints, FORCED_OPEN_PENALTY } = require('../utils/points-calculator');
const { checkAndAwardBadges, getUserStats } = require('../utils/badge-checker');

/**
 * Get user profile by ID (public view).
 * @param {string} userId
 * @param {string|null} viewerId - ID of the user viewing the profile (for follow status)
 * @returns {Promise<object|null>}
 */
async function getUserProfile(userId, viewerId = null) {
  // Satu query utama gantikan 6 round-trip: ambil user + follow counts + follow status dalam 1x
  const viewerClause = viewerId && viewerId !== userId
    ? `, EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) as is_followed_by_viewer,
         (EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AND EXISTS(SELECT 1 FROM follows WHERE follower_id = u.id AND following_id = $2)) as is_mutual_friend`
    : `, false as is_followed_by_viewer, false as is_mutual_friend`;

  const params = viewerId && viewerId !== userId ? [userId, viewerId] : [userId];
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.total_points,
            u.total_forced_opens, u.longest_streak_days, u.current_streak_days, u.created_at,
            (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) as followers_count,
            (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) as following_count
            ${viewerClause}
     FROM users u WHERE u.id = $1`,
    params
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0];

  // 2 query paralel (bukan 4 sequential) untuk locks & badges
  const [activeLocksResult, badgesResult] = await Promise.all([
    query(
      'SELECT app_name, package_name, lock_type, start_time, duration_hours FROM locked_apps WHERE user_id = $1 AND is_active = true ORDER BY start_time DESC LIMIT 50',
      [userId]
    ),
    query(
      `SELECT b.code, b.name, b.description, b.icon_url, b.category, b.rarity, ub.earned_at
       FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC`,
      [userId]
    ),
  ]);
  user.active_locks = activeLocksResult.rows;
  user.active_locks_count = activeLocksResult.rows.length;
  user.badges = badgesResult.rows;

  return user;
}

/**
 * Update user profile fields.
 * @param {string} userId
 * @param {object} updates - { username?, display_name?, bio?, avatar_url? }
 * @returns {Promise<object>}
 */
async function updateUserProfile(userId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.username !== undefined) {
    // Check uniqueness
    const existing = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [updates.username, userId]);
    if (existing.rows.length > 0) {
      throw new Error('Username sudah digunakan');
    }
    fields.push(`username = $${paramIndex++}`);
    values.push(updates.username);
  }
  if (updates.display_name !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    values.push(updates.display_name);
  }
  if (updates.bio !== undefined) {
    fields.push(`bio = $${paramIndex++}`);
    values.push(updates.bio);
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url);
  }

  if (fields.length === 0) throw new Error('Tidak ada perubahan');

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, display_name, bio, avatar_url`,
    values
  );

  return result.rows[0];
}

/**
 * Search users by username, display name, or email.
 * @param {string|null} currentUserId - Current logged in user ID
 * @param {string} searchQuery
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function searchUsers(currentUserId, searchQuery, limit = 20) {
  const pattern = `%${searchQuery}%`;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  // Gunakan JOIN agregasi untuk followers/following count, dan EXISTS hanya 2x (bukan 2 COUNT correlated per baris)
  if (currentUserId) {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) as is_following,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = u.id AND following_id = $1) as is_follower
       FROM users u
       WHERE u.id != $1 AND (u.username ILIKE $2 OR u.display_name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u.username ASC
       LIMIT $3`,
      [currentUserId, pattern, safeLimit]
    );
    return result.rows;
  } else {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days,
              false as is_following, false as is_follower
       FROM users u
       WHERE u.username ILIKE $1 OR u.display_name ILIKE $1 OR u.email ILIKE $1
       ORDER BY u.username ASC
       LIMIT $2`,
      [pattern, safeLimit]
    );
    return result.rows;
  }
}

/**
 * Sync locked apps from device to cloud.
 * @param {string} userId
 * @param {Array} locks - Array of lock objects from the device
 */
async function syncLockedApps(userId, locks) {
  for (const lock of locks) {
    await query(
      `INSERT INTO locked_apps (id, user_id, package_name, app_name, lock_type, start_time, duration_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET is_active = $8`,
      [lock.id, userId, lock.package_name, lock.app_name, lock.lock_type, lock.start_time, lock.duration_hours, lock.is_active]
    );
  }
}

/**
 * Report a forced open event.
 * @param {string} userId
 * @param {string} packageName
 * @param {string|null} lockedAppId
 * @returns {Promise<object>}
 */
async function reportForcedOpen(userId, packageName, lockedAppId = null) {
  // Insert forced open record
  await query(
    'INSERT INTO forced_opens (user_id, locked_app_id, package_name) VALUES ($1, $2, $3)',
    [userId, lockedAppId, packageName]
  );

  // Update user stats — increment forced opens, reset streak
  await query(
    `UPDATE users SET total_forced_opens = total_forced_opens + 1, current_streak_days = 0 WHERE id = $1`,
    [userId]
  );

  // Apply points penalty
  await query(
    `INSERT INTO points_transactions (user_id, amount, source_type, description)
     VALUES ($1, $2, 'forced_open', $3)`,
    [userId, FORCED_OPEN_PENALTY, `Membuka paksa: ${packageName}`]
  );
  await query('UPDATE users SET total_points = GREATEST(total_points + $1, 0) WHERE id = $2', [FORCED_OPEN_PENALTY, userId]);

  // Check if in any active challenge
  const challengeResult = await query(
    `SELECT cp.challenge_id FROM challenge_participants cp
     JOIN challenges c ON cp.challenge_id = c.id
     WHERE cp.user_id = $1 AND c.status = 'active' AND c.package_name = $2`,
    [userId, packageName]
  );

  for (const row of challengeResult.rows) {
    await query(
      'INSERT INTO challenge_forced_opens (challenge_id, user_id) VALUES ($1, $2)',
      [row.challenge_id, userId]
    );
    await query(
      'UPDATE challenge_participants SET forced_open_count = forced_open_count + 1 WHERE challenge_id = $1 AND user_id = $2',
      [row.challenge_id, userId]
    );
  }

  // Get updated count
  const countResult = await query('SELECT total_forced_opens FROM users WHERE id = $1', [userId]);
  return { total_forced_opens: countResult.rows[0].total_forced_opens };
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  syncLockedApps,
  reportForcedOpen,
};
