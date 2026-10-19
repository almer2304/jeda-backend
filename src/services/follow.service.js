const { query } = require('../config/database');
const notificationService = require('./notification.service');

/**
 * Follow a user.
 * @param {string} followerId
 * @param {string} followingId
 */
async function followUser(followerId, followingId) {
  if (followerId === followingId) throw new Error('Tidak bisa follow diri sendiri');

  // Check if target user exists
  const userCheck = await query('SELECT id, username, display_name FROM users WHERE id = $1', [followingId]);
  if (userCheck.rows.length === 0) throw new Error('User tidak ditemukan');

  const followerUser = await query('SELECT id, username, display_name FROM users WHERE id = $1', [followerId]);
  const followerName = followerUser.rows[0]?.display_name || followerUser.rows[0]?.username || 'Seseorang';
  const followerUsername = followerUser.rows[0]?.username || 'user';

  // Check if the other user was ALREADY following this follower (mutual check)
  const isFollowingBack = await query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followingId, followerId]
  );
  const wasAlreadyFollowedByTarget = isFollowingBack.rows.length > 0;

  await query(
    'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [followerId, followingId]
  );

  // Send Notification to followingId
  if (wasAlreadyFollowedByTarget) {
    // Follow back notification: "USERNAME telah mengikuti Anda balik"
    await notificationService.createNotification(
      followingId,
      'follow_back',
      'Teman Baru Terhubung! 🤝',
      `@${followerUsername} telah mengikuti Anda balik. Sekarang Anda berteman dan bisa saling memantau komitmen fokus!`,
      { userId: followerId, username: followerUsername }
    );
  } else {
    // Normal follow notification
    await notificationService.createNotification(
      followingId,
      'follow',
      'Pengikut Baru 👥',
      `@${followerUsername} (${followerName}) mulai mengikuti Anda di Jeda.`,
      { userId: followerId, username: followerUsername }
    );
  }
}

/**
 * Unfollow a user.
 * @param {string} followerId
 * @param {string} followingId
 */
async function unfollowUser(followerId, followingId) {
  await query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
}

/**
 * Get mutual friends (users who follow each other).
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getMutualFriends(userId) {
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days
     FROM follows f1
     JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
     JOIN users u ON f1.following_id = u.id
     WHERE f1.follower_id = $1
     ORDER BY u.username ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get followers list.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getFollowers(userId) {
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days,
            EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) as is_following,
            true as is_follower
     FROM follows f JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC
     LIMIT 100`,
    [userId]
  );
  return result.rows;
}

/**
 * Get following list.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getFollowing(userId) {
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days,
            true as is_following,
            EXISTS (SELECT 1 FROM follows WHERE follower_id = u.id AND following_id = $1) as is_follower
     FROM follows f JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC
     LIMIT 100`,
    [userId]
  );
  return result.rows;
}

module.exports = { followUser, unfollowUser, getMutualFriends, getFollowers, getFollowing };