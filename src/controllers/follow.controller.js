const followService = require('../services/follow.service');

async function follow(req, res, next) {
  try {
    const { userId } = req.params;
    await followService.followUser(req.user.id, userId);
    res.json({ message: 'Berhasil mengikuti user' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function unfollow(req, res, next) {
  try {
    const { userId } = req.params;
    await followService.unfollowUser(req.user.id, userId);
    res.json({ message: 'Berhasil berhenti mengikuti user' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getFriends(req, res, next) {
  try {
    const friends = await followService.getMutualFriends(req.user.id);
    res.json({ friends });
  } catch (error) {
    next(error);
  }
}

async function getFollowers(req, res, next) {
  try {
    const followers = await followService.getFollowers(req.user.id);
    res.json({ followers });
  } catch (error) {
    next(error);
  }
}

async function getFollowing(req, res, next) {
  try {
    const following = await followService.getFollowing(req.user.id);
    res.json({ following });
  } catch (error) {
    next(error);
  }
}

module.exports = { follow, unfollow, getFriends, getFollowers, getFollowing };
