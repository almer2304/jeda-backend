const notificationService = require('../services/notification.service');

async function getNotifications(req, res, next) {
  try {
    const { limit } = req.query;
    const notifications = await notificationService.getUserNotifications(req.user.id, limit);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const { ids } = req.body; // array of notification IDs or empty for all
    await notificationService.markAsRead(req.user.id, Array.isArray(ids) ? ids : []);
    res.json({ message: 'Notifikasi berhasil ditandai telah dibaca' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markRead,
};
