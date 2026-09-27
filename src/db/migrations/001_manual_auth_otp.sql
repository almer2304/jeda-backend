-- ============================================================================
-- JEDA DATABASE MIGRATION: Support Manual Email/Password & OTP Verification
-- ============================================================================

-- 1. Jadikan firebase_uid NULLABLE (karena user manual tidak punya firebase_uid saat register)
ALTER TABLE public.users ALTER COLUMN firebase_uid DROP NOT NULL;

-- 2. Tambahkan kolom password_hash untuk menyimpan hash password (bcrypt)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash character varying;

-- 3. Tambahkan kolom otp_code & otp_expires untuk verifikasi OTP 6 digit
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code character varying(6);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires timestamp with time zone;
