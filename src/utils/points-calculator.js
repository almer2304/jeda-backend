/**
 * Jeda Points Calculator
 *
 * Rumus:
 * - Base points           = duration_hours × 10
 * - Daily bonus           = floor(elapsed_days) × 5
 * - Weekly bonus          = floor(elapsed_weeks) × 50
 * - Streak multiplier     = 1 + (current_streak_days × 0.05), max 2.0x
 * - Forced open penalty   = -20 per forced open
 */

/**
 * Calculate base points for a completed lock session.
 * @param {number} durationHours - Total lock duration in hours
 * @returns {number}
 */
function calculateBasePoints(durationHours) {
  return Math.floor(durationHours * 10);
}

/**
 * Calculate daily bonus points (awarded periodically during long locks).
 * @param {number} elapsedDays - Number of full days elapsed
 * @returns {number}
 */
function calculateDailyBonus(elapsedDays) {
  return Math.floor(elapsedDays) * 5;
}

/**
 * Calculate weekly bonus points.
 * @param {number} elapsedDays - Number of full days elapsed
 * @returns {number}
 */
function calculateWeeklyBonus(elapsedDays) {
  const weeks = Math.floor(elapsedDays / 7);
  return weeks * 50;
}

/**
 * Calculate streak multiplier.
 * @param {number} currentStreakDays - Current streak in days
 * @returns {number} Multiplier (1.0 - 2.0)
 */
function calculateStreakMultiplier(currentStreakDays) {
  const multiplier = 1 + currentStreakDays * 0.05;
  return Math.min(multiplier, 2.0);
}

/**
 * Calculate total points for a completed lock.
 * @param {object} params
 * @param {number} params.durationHours - Lock duration in hours
 * @param {number} params.currentStreakDays - User's current streak
 * @returns {number}
 */
function calculateLockCompletionPoints({ durationHours, currentStreakDays }) {
  const elapsedDays = durationHours / 24;
  const base = calculateBasePoints(durationHours);
  const daily = calculateDailyBonus(elapsedDays);
  const weekly = calculateWeeklyBonus(elapsedDays);
  const multiplier = calculateStreakMultiplier(currentStreakDays);

  return Math.floor((base + daily + weekly) * multiplier);
}

/**
 * Calculate interim daily claim points (for locks > 24h, user can claim daily).
 * @param {number} currentStreakDays
 * @returns {number}
 */
function calculateDailyClaimPoints(currentStreakDays) {
  const multiplier = calculateStreakMultiplier(currentStreakDays);
  // 24 hours × 10 base + 5 daily bonus
  return Math.floor((240 + 5) * multiplier);
}

const FORCED_OPEN_PENALTY = -20;

module.exports = {
  calculateBasePoints,
  calculateDailyBonus,
  calculateWeeklyBonus,
  calculateStreakMultiplier,
  calculateLockCompletionPoints,
  calculateDailyClaimPoints,
  FORCED_OPEN_PENALTY,
};
