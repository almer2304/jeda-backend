-- Seed Data Initial Badges (16 Badges)
INSERT INTO badges (code, name, description, category, requirement_type, requirement_value, points_reward, rarity) VALUES
('first_lock', '🌱 Pemula Sadar', 'Kunci 1 aplikasi pertama kali', 'discipline', 'locks_completed', 1, 10, 'common'),
('locks_10', '🔒 Tukang Kunci', 'Selesaikan 10 sesi fokus penguncian', 'discipline', 'locks_completed', 10, 50, 'common'),
('locks_100', '🏅 Master Kunci', 'Selesaikan 100 sesi fokus penguncian', 'discipline', 'locks_completed', 100, 1000, 'epic'),

('streak_7', '🔥 Streak 7 Hari', 'Pertahankan streak selama 7 hari berturut-turut', 'streak', 'streak_days', 7, 50, 'common'),
('streak_30', '⚡ Streak 30 Hari', 'Pertahankan streak selama 30 hari berturut-turut', 'streak', 'streak_days', 30, 200, 'rare'),
('streak_365', '💎 Streak 365 Hari', 'Pertahankan streak selama 1 tahun penuh', 'streak', 'streak_days', 365, 5000, 'legendary'),

('no_force_7', '🛡️ Baja Besi', '7 hari bertahan tanpa membuka paksa aplikasi', 'discipline', 'no_forced_open_days', 7, 100, 'common'),
('no_force_30', '🏰 Benteng Kokoh', '30 hari bertahan tanpa membuka paksa aplikasi', 'discipline', 'no_forced_open_days', 30, 500, 'rare'),
('no_force_365', '🗼 Menara Gading', '365 hari bertahan tanpa membuka paksa aplikasi', 'discipline', 'no_forced_open_days', 365, 5000, 'legendary'),

('first_friend', '👥 Sosialis', 'Punya 1 teman (mutual follow)', 'social', 'mutual_friends', 1, 20, 'common'),
('friends_10', '🌐 Influencer', 'Punya 10 teman (mutual follow)', 'social', 'mutual_friends', 10, 200, 'rare'),

('first_challenge', '⚔️ Challenger', 'Selesaikan 1 challenge bersama teman', 'challenge', 'challenge_completed', 1, 50, 'common'),
('challenge_win_5', '🏆 Juara Challenge', 'Menangkan 5 challenge tanpa forced open', 'challenge', 'challenge_won', 5, 300, 'rare'),
('challenge_win_25', '👑 Raja Tantangan', 'Menangkan 25 challenge tanpa forced open', 'challenge', 'challenge_won', 25, 1500, 'epic'),

('points_1000', '💯 1000 Poin Club', 'Kumpulkan total 1.000 poin', 'discipline', 'total_points', 1000, 0, 'rare'),
('points_10000', '🌟 10K Legend', 'Kumpulkan total 10.000 poin', 'discipline', 'total_points', 10000, 0, 'legendary')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  points_reward = EXCLUDED.points_reward;
