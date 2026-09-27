-- ============================================================================
-- JEDA SUPABASE: FULL INITIAL SCHEMA & RELATIONS
-- Salin dan jalankan seluruh isi query ini di SQL Editor Supabase
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  firebase_uid character varying UNIQUE,
  email character varying NOT NULL UNIQUE,
  username character varying NOT NULL UNIQUE,
  display_name character varying,
  password_hash character varying,
  avatar_url text,
  bio text,
  is_email_verified boolean DEFAULT false,
  otp_code character varying(6),
  otp_expires timestamp with time zone,
  email_verify_token character varying,
  email_verify_expires timestamp with time zone,
  total_points integer DEFAULT 0,
  total_forced_opens integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  current_streak_days integer DEFAULT 0,
  last_streak_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Pastikan firebase_uid nullable dan kolom auth manual tersedia jika table sudah ada sebelumnya
ALTER TABLE public.users ALTER COLUMN firebase_uid DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash character varying;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code character varying(6);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires timestamp with time zone;

-- 2. LOCKED APPS TABLE
CREATE TABLE IF NOT EXISTS public.locked_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  package_name character varying NOT NULL,
  app_name character varying NOT NULL,
  lock_type character varying NOT NULL,
  start_time timestamp with time zone NOT NULL,
  duration_hours integer,
  is_active boolean DEFAULT true,
  points_earned integer DEFAULT 0,
  points_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locked_apps_pkey PRIMARY KEY (id)
);

-- 3. FORCED OPENS TABLE
CREATE TABLE IF NOT EXISTS public.forced_opens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  locked_app_id uuid REFERENCES public.locked_apps(id) ON DELETE SET NULL,
  package_name character varying NOT NULL,
  opened_at timestamp with time zone DEFAULT now(),
  CONSTRAINT forced_opens_pkey PRIMARY KEY (id)
);

-- 4. POINTS TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  source_type character varying NOT NULL,
  source_id uuid,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT points_transactions_pkey PRIMARY KEY (id)
);

-- 5. BADGES TABLE
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  icon_url text,
  category character varying,
  requirement_type character varying,
  requirement_value integer,
  points_reward integer DEFAULT 0,
  rarity character varying DEFAULT 'common',
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);

-- 6. USER BADGES (JUNCTION TABLE)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id)
);

-- 7. FOLLOWS TABLE (FRIENDSHIP / MUTUAL)
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

-- 8. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title character varying NOT NULL,
  description text,
  package_name character varying NOT NULL,
  app_name character varying NOT NULL,
  duration_hours integer NOT NULL,
  max_forced_opens integer DEFAULT 0,
  challenge_type character varying NOT NULL DEFAULT 'global',
  status character varying DEFAULT 'active',
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  min_participants integer DEFAULT 2,
  max_participants integer,
  points_reward integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id)
);

-- 9. CHALLENGE PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  status character varying DEFAULT 'accepted',
  forced_open_count integer DEFAULT 0,
  surrendered_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenge_participants_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_participants_unique UNIQUE (challenge_id, user_id)
);

-- 10. CHALLENGE FORCED OPENS TABLE
CREATE TABLE IF NOT EXISTS public.challenge_forced_opens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  opened_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenge_forced_opens_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 11. SEED DATA: 16 DEFAULT BADGES
-- ============================================================================
INSERT INTO public.badges (code, name, description, icon_url, category, requirement_type, requirement_value, points_reward, rarity)
VALUES
  -- Streak Badges
  ('streak_3', '🌱 Pemula Sadar', 'Menjaga streak fokus selama 3 hari berturut-turut.', '🌱', 'streak', 'streak_days', 3, 30, 'common'),
  ('streak_7', '🔥 Semangat Membara', 'Menjaga streak fokus selama 7 hari berturut-turut.', '🔥', 'streak', 'streak_days', 7, 70, 'common'),
  ('streak_14', '⚡ Disiplin Kuat', 'Menjaga streak fokus selama 14 hari berturut-turut.', '⚡', 'streak', 'streak_days', 14, 150, 'rare'),
  ('streak_30', '🏆 Master Mindful', 'Menjaga streak fokus selama 30 hari penuh!', '🏆', 'streak', 'streak_days', 30, 300, 'epic'),
  ('streak_60', '👑 Penguasa Diri', '60 hari bebas distraksi tanpa terputus!', '👑', 'streak', 'streak_days', 60, 600, 'legendary'),

  -- Lock Duration Badges
  ('hours_10', '⏳ Penabung Waktu I', 'Mengunci total 10 jam distraksi.', '⏳', 'duration', 'total_hours', 10, 50, 'common'),
  ('hours_50', '🛡️ Baja Besi', 'Mengunci total 50 jam distraksi.', '🛡️', 'duration', 'total_hours', 50, 200, 'rare'),
  ('hours_100', '💎 Jiwa Tenang', 'Mengunci total 100 jam distraksi.', '💎', 'duration', 'total_hours', 100, 500, 'epic'),
  ('hours_500', '🌌 Zen Master', 'Mengunci total 500 jam distraksi!', '🌌', 'duration', 'total_hours', 500, 1500, 'legendary'),

  -- Discipline / No Forced Open Badges
  ('zero_forced_7', '🧘 Hening Total', '7 hari tanpa pernah membuka paksa aplikasi.', '🧘', 'discipline', 'zero_forced_days', 7, 100, 'rare'),
  ('zero_forced_30', '🏔️ Tak Tergoyahkan', '30 hari tanpa satupun forced open!', '🏔️', 'discipline', 'zero_forced_days', 30, 400, 'epic'),

  -- Social & Challenge Badges
  ('first_friend', '🤝 Teman Seperjuangan', 'Saling follow dengan teman pertamamu.', '🤝', 'social', 'mutual_friends', 1, 20, 'common'),
  ('friends_5', '👥 Lingkaran Positif', 'Memiliki 5 teman mindful di Jeda.', '👥', 'social', 'mutual_friends', 5, 100, 'rare'),
  ('challenge_win_1', '🎯 Penakluk Pertama', 'Menyelesaikan 1 challenge bersama teman.', '🎯', 'challenge', 'challenge_completed', 1, 50, 'common'),
  ('challenge_win_5', '⚔️ Pejuang Fokus', 'Menyelesaikan 5 challenge bersama teman.', '⚔️', 'challenge', 'challenge_completed', 5, 250, 'epic'),
  ('challenge_win_10', '🌟 Legenda Komunitas', 'Menyelesaikan 10 challenge bersama teman.', '🌟', 'challenge', 'challenge_completed', 10, 500, 'legendary')
ON CONFLICT (code) DO NOTHING;
