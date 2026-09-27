const userService = require('../services/user.service');

async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const viewerId = req.user ? req.user.id : null;
    const profile = await userService.getUserProfile(id, viewerId);

    if (!profile) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updated = await userService.updateUserProfile(req.user.id, req.body);
    res.json({ message: 'Profil berhasil diperbarui', user: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query pencarian (q) wajib diisi' });
    }

    const currentUserId = req.user ? req.user.id : null;
    const users = await userService.searchUsers(currentUserId, q.trim());
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function syncLocks(req, res, next) {
  try {
    const { locks } = req.body;
    if (!Array.isArray(locks)) {
      return res.status(400).json({ error: 'locks harus berupa array' });
    }

    await userService.syncLockedApps(req.user.id, locks);
    res.json({ message: 'Sync locked apps berhasil' });
  } catch (error) {
    next(error);
  }
}

async function reportForcedOpen(req, res, next) {
  try {
    const { package_name, locked_app_id } = req.body;
    if (!package_name) {
      return res.status(400).json({ error: 'package_name wajib diisi' });
    }

    const result = await userService.reportForcedOpen(req.user.id, package_name, locked_app_id);
    res.json({ message: 'Forced open tercatat', ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  searchUsers,
  syncLocks,
  reportForcedOpen,
};
