-- ============================================================================
-- 002_performance_indexes.sql — Optimasi query Jeda (DBA Review)
-- Jalankan di Supabase SQL Editor SETELAH 001 / SUPABASE_FULL_SETUP.sql
-- ============================================================================

-- Aktifkan trigram untuk pencarian ILIKE %keyword% yang cepat
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --------------------------------------------------------------------------
-- USERS : leaderboard sorting + search
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_total_points_desc ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_streak_desc ON users(current_streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- --------------------------------------------------------------------------
-- FOLLOWS : semua query follow/friends bergantung pada ini
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- --------------------------------------------------------------------------
-- CHALLENGES : filter global & my challenges
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_challenges_type_status_created ON challenges(challenge_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_package_name ON challenges(package_name);
CREATE INDEX IF NOT EXISTS idx_challenges_end_time ON challenges(end_time) WHERE status = 'active';

-- --------------------------------------------------------------------------
-- CHALLENGE_PARTICIPANTS : join paling sering
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_status ON challenge_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_status ON challenge_participants(challenge_id, status);

-- --------------------------------------------------------------------------
-- CHALLENGE_FORCED_OPENS : attempt history
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cfo_challenge ON challenge_forced_opens(challenge_id);
CREATE INDEX IF NOT EXISTS idx_cfo_user ON challenge_forced_opens(user_id);
CREATE INDEX IF NOT EXISTS idx_cfo_opened_at ON challenge_forced_opens(opened_at DESC);

-- --------------------------------------------------------------------------
-- LOCKED_APPS : sync & profile
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_locked_apps_user_active ON locked_apps(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_locked_apps_user_start ON locked_apps(user_id, start_time DESC);

-- --------------------------------------------------------------------------
-- FORCED_OPENS : badge no_force_* & report
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_forced_opens_user_opened ON forced_opens(user_id, opened_at DESC);

-- --------------------------------------------------------------------------
-- POINTS_TRANSACTIONS : history
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_points_user_created ON points_transactions(user_id, created_at DESC);

-- --------------------------------------------------------------------------
-- USER_BADGES : badge_count di leaderboard & profile
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- --------------------------------------------------------------------------
-- VACUUM ANALYZE agar planner pakai index baru
-- --------------------------------------------------------------------------
VACUUM ANALYZE users, follows, challenges, challenge_participants, challenge_forced_opens, locked_apps, forced_opens, points_transactions, user_badges;
