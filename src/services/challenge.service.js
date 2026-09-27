const { query, getClient } = require('../config/database');

async function createChallenge(creatorId, data) {
  const {
    title,
    description,
    package_name,
    app_name,
    duration_hours,
    max_forced_opens = 0,
    challenge_type = 'private', // 'private' or 'global'
    invite_user_ids = [], // Array of user IDs for private challenge
  } = data;

  const hasInvites = challenge_type === 'private' && Array.isArray(invite_user_ids) && invite_user_ids.filter((id) => id !== creatorId).length > 0;
  // Private + ada undangan => pending hingga SEMUA menerima. Global atau tanpa undangan => langsung aktif.
  const initialStatus = hasInvites ? 'pending' : 'active';

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Jika pending, start/end NULL dulu — akan diisi saat tantangan diaktifkan (semua accept)
    const startTime = initialStatus === 'active' ? new Date() : null;
    const endTime = initialStatus === 'active' ? new Date(startTime.getTime() + duration_hours * 60 * 60 * 1000) : null;

    const challengeResult = await client.query(
      `INSERT INTO challenges (creator_id, title, description, package_name, app_name, duration_hours, max_forced_opens, challenge_type, status, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [creatorId, title, description, package_name, app_name, duration_hours, max_forced_opens, challenge_type, initialStatus, startTime, endTime]
    );

    const challenge = challengeResult.rows[0];

    // Add creator as accepted participant
    await client.query(
      `INSERT INTO challenge_participants (challenge_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())`,
      [challenge.id, creatorId]
    );

    // Invite users if private
    if (hasInvites) {
      for (const userId of invite_user_ids) {
        if (userId !== creatorId) {
          await client.query(
            `INSERT INTO challenge_participants (challenge_id, user_id, status)
             VALUES ($1, $2, 'invited')`,
            [challenge.id, userId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return challenge;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function maybeCompleteExpired() {
  try {
    await query("UPDATE challenges SET status = 'completed' WHERE status = 'active' AND end_time IS NOT NULL AND end_time < NOW()");
  } catch (_) {}
}

async function getGlobalChallenges() {
  await maybeCompleteExpired();
  // JOIN agregasi + LIMIT 50 agar tidak scan seluruh table saat data sudah banyak
  const result = await query(
    `SELECT c.*, u.username as creator_username, u.display_name as creator_name,
            COALESCE(pc.participant_count, 0) as participant_count
     FROM challenges c
     JOIN users u ON c.creator_id = u.id
     LEFT JOIN (
       SELECT challenge_id, COUNT(*)::int as participant_count
       FROM challenge_participants WHERE status = 'accepted' GROUP BY challenge_id
     ) pc ON pc.challenge_id = c.id
     WHERE c.challenge_type = 'global' AND c.status = 'active'
     ORDER BY c.created_at DESC
     LIMIT 50`
  );
  return result.rows;
}

async function getMyChallenges(userId) {
  await maybeCompleteExpired();
  const result = await query(
    `SELECT c.*, cp.status as my_status, cp.forced_open_count,
            COALESCE(pc.participant_count, 0) as participant_count
     FROM challenge_participants cp
     JOIN challenges c ON cp.challenge_id = c.id
     LEFT JOIN (
       SELECT challenge_id, COUNT(*)::int as participant_count
       FROM challenge_participants WHERE status = 'accepted' GROUP BY challenge_id
     ) pc ON pc.challenge_id = c.id
     WHERE cp.user_id = $1
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [userId]
  );
  return result.rows;
}

async function getChallengeDetail(challengeId) {
  await maybeCompleteExpired();
  const challengeResult = await query(
    `SELECT c.*, u.username as creator_username, u.display_name as creator_name, u.avatar_url as creator_avatar
     FROM challenges c JOIN users u ON c.creator_id = u.id
     WHERE c.id = $1`,
    [challengeId]
  );

  if (challengeResult.rows.length === 0) return null;
  const challenge = challengeResult.rows[0];

  const participantsResult = await query(
    `SELECT cp.*, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak_days
     FROM challenge_participants cp JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = $1
     ORDER BY cp.joined_at ASC`,
    [challengeId]
  );
  challenge.participants = participantsResult.rows;

  // Get attempt history (forced open logs during challenge)
  const attemptsResult = await query(
    `SELECT cfo.id, cfo.user_id, u.username, u.display_name, u.avatar_url, cfo.opened_at
     FROM challenge_forced_opens cfo
     JOIN users u ON cfo.user_id = u.id
     WHERE cfo.challenge_id = $1
     ORDER BY cfo.opened_at DESC`,
    [challengeId]
  );
  challenge.attempts = attemptsResult.rows;

  return challenge;
}

async function respondToInvite(challengeId, userId, action) {
  const status = action === 'accept' ? 'accepted' : 'declined';
  const result = await query(
    `UPDATE challenge_participants
     SET status = $1, joined_at = NOW()
     WHERE challenge_id = $2 AND user_id = $3
     RETURNING *`,
    [status, challengeId, userId]
  );

  // Jika private & pending, cek apakah SEMUA undangan sudah diterima -> aktifkan tantangan
  const challengeRes = await query(`SELECT id, status, challenge_type, duration_hours FROM challenges WHERE id = $1`, [challengeId]);
  if (challengeRes.rows.length > 0) {
    const ch = challengeRes.rows[0];
    if (ch.challenge_type === 'private' && ch.status === 'pending') {
      if (status === 'declined') {
        // Jika ada yang menolak, tantangan dibatalkan (tidak adil lanjut tanpa persetujuan semua)
        await query(`UPDATE challenges SET status = 'cancelled' WHERE id = $1`, [challengeId]);
      } else {
        // Cek sisa undangan 'invited'
        const pendingRes = await query(
          `SELECT COUNT(*)::int as cnt FROM challenge_participants WHERE challenge_id = $1 AND status = 'invited'`,
          [challengeId]
        );
        if (pendingRes.rows[0].cnt === 0) {
          // Semua sudah accept -> aktifkan & set start/end sekarang
          const start = new Date();
          const end = new Date(start.getTime() + ch.duration_hours * 60 * 60 * 1000);
          await query(`UPDATE challenges SET status = 'active', start_time = $1, end_time = $2 WHERE id = $3`, [start, end, challengeId]);
        }
      }
    }
  }

  return result.rows[0];
}

async function surrenderChallenge(challengeId, userId) {
  const challengeCheck = await query('SELECT title FROM challenges WHERE id = $1', [challengeId]);
  const challengeTitle = challengeCheck.rows[0]?.title || 'Tantangan';

  const result = await query(
    `UPDATE challenge_participants
     SET status = 'surrendered', surrendered_at = NOW()
     WHERE challenge_id = $1 AND user_id = $2
     RETURNING *`,
    [challengeId, userId]
  );

  // Penalti poin saat menyerah (-50 poin)
  const PENALTY_POINTS = -50;
  await query(
    `INSERT INTO points_transactions (user_id, amount, source_type, source_id, description)
     VALUES ($1, $2, 'challenge_surrender', $3, $4)`,
    [userId, PENALTY_POINTS, challengeId, `Menyerah pada tantangan: ${challengeTitle}`]
  );
  await query(
    'UPDATE users SET total_points = GREATEST(total_points + $1, 0), current_streak_days = 0 WHERE id = $2',
    [PENALTY_POINTS, userId]
  );

  return result.rows[0];
}

async function recordAttempt(challengeId, userId) {
  await query(
    'INSERT INTO challenge_forced_opens (challenge_id, user_id) VALUES ($1, $2)',
    [challengeId, userId]
  );
  await query(
    'UPDATE challenge_participants SET forced_open_count = forced_open_count + 1 WHERE challenge_id = $1 AND user_id = $2',
    [challengeId, userId]
  );

  return { success: true };
}

module.exports = {
  createChallenge,
  getGlobalChallenges,
  getMyChallenges,
  getChallengeDetail,
  respondToInvite,
  surrenderChallenge,
  recordAttempt,
};
