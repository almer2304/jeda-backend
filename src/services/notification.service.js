const { query } = require('../config/database');

/**
 * Create a new notification for a user.
 * @param {string} userId - Recipient user ID
 * @param {string} type - 'follow', 'follow_back', 'challenge_invite', 'challenge_accepted', 'challenge_global'
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object|null} data - Additional metadata (e.g. { userId, challengeId, ... })
 */
async function createNotification(userId, type, title, body, data = {}) {
  try {
    const dataJson = typeof data === 'object' ? JSON.stringify(data) : data;
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())
       RETURNING *`,
      [userId, type, title, body, dataJson]
    );
    return result.rows[0];
  } catch (error) {
    // If table doesn't exist yet, gracefully catch so other actions succeed
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Notify multiple users (e.g. for global challenges, throttled to a subset or all).
 */
async function createBulkNotifications(userIds, type, title, body, data = {}) {
  for (const uid of userIds) {
    await createNotification(uid, type, title, body, data);
  }
}

/**
 * Get notifications for a user.
 */
async function getUserNotifications(userId, limit = 20) {
  try {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const result = await query(
      `SELECT id, user_id, type, title, body, data, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  } catch (error) {
    console.error('Failed to get notifications:', error.message);
    return [];
  }
}

/**
 * Mark notifications as read.
 */
async function markAsRead(userId, notificationIds = []) {
  try {
    if (notificationIds.length === 0) {
      await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    } else {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2::uuid[])',
        [userId, notificationIds]
      );
    }
    return true;
  } catch (error) {
    console.error('Failed to mark notifications read:', error.message);
    return false;
  }
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
};
