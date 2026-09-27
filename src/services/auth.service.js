const { query } = require('../config/database');
const { verifyGoogleToken } = require('../config/firebase');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../config/smtp');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Register a new user with manual Email, Username, Password, and Display Name.
 * Automatically generates 6-digit OTP and sends it via Email.
 * @param {object} data - { email, username, password, display_name }
 * @returns {Promise<{ user: object, message: string }>}
 */
async function registerManual(data) {
  const { email, username, password, display_name } = data;

  if (!email || !password || !username) {
    throw new Error('Email, username, dan password wajib diisi');
  }

  // Cek duplikasi email
  const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingEmail.rows.length > 0) {
    throw new Error('Email sudah terdaftar');
  }

  // Cek duplikasi username
  const existingUsername = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existingUsername.rows.length > 0) {
    throw new Error('Username sudah digunakan');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate 6 digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

  const result = await query(
    `INSERT INTO users (email, username, display_name, password_hash, otp_code, otp_expires, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING *`,
    [email, username, display_name || username, passwordHash, otpCode, otpExpires]
  );

  const newUser = result.rows[0];

  // Kirim email OTP
  await sendOtpEmail(email, newUser.display_name || username, otpCode);

  return {
    user: sanitizeUser(newUser),
    message: `Registrasi berhasil. Kode OTP verifikasi telah dikirim ke ${email}`,
  };
}

/**
 * Verify OTP code after registration.
 * If valid, verifies the user and returns JWT token so user directly logs in.
 * @param {string} email
 * @param {string} otpCode
 * @returns {Promise<{ user: object, token: string, message: string }>}
 */
async function verifyOtp(email, otpCode) {
  if (!email || !otpCode) {
    throw new Error('Email dan kode OTP wajib diisi');
  }

  const result = await query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('User tidak ditemukan');
  }

  const user = result.rows[0];

  if (!user.otp_code || user.otp_code !== otpCode) {
    throw new Error('Kode OTP tidak valid');
  }

  if (new Date() > new Date(user.otp_expires)) {
    throw new Error('Kode OTP sudah kadaluarsa. Silakan minta kirim ulang OTP');
  }

  // Mark as verified & clear OTP
  const updateResult = await query(
    `UPDATE users
     SET is_email_verified = true, otp_code = NULL, otp_expires = NULL
     WHERE id = $1
     RETURNING *`,
    [user.id]
  );

  const verifiedUser = updateResult.rows[0];
  const token = generateToken(verifiedUser.id);

  return {
    user: sanitizeUser(verifiedUser),
    token,
    message: 'Verifikasi berhasil! Selamat datang di Jeda',
  };
}

/**
 * Resend OTP code for email verification.
 * @param {string} email
 */
async function resendOtp(email) {
  if (!email) throw new Error('Email wajib diisi');

  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    throw new Error('User dengan email ini tidak ditemukan');
  }

  const user = result.rows[0];
  if (user.is_email_verified) {
    throw new Error('Akun ini sudah terverifikasi');
  }

  // Generate 6 digit OTP baru
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

  await query(
    `UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3`,
    [otpCode, otpExpires, user.id]
  );

  await sendOtpEmail(email, user.display_name || user.username, otpCode);

  return { message: `Kode OTP baru telah dikirim ke ${email}` };
}

/**
 * Login manually with email/username and password.
 * @param {string} identifier - Email or Username
 * @param {string} password
 * @returns {Promise<{ user: object, token: string }>}
 */
async function loginManual(identifier, password) {
  if (!identifier || !password) {
    throw new Error('Email/username dan password wajib diisi');
  }

  // Cari berdasarkan email atau username
  const result = await query(
    'SELECT * FROM users WHERE email = $1 OR username = $1',
    [identifier]
  );

  if (result.rows.length === 0) {
    throw new Error('Email/Username atau password salah');
  }

  const user = result.rows[0];

  if (!user.password_hash) {
    throw new Error('Akun ini dibuat melalui Google Sign-In. Silakan login dengan Google');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Email/Username atau password salah');
  }

  const token = generateToken(user.id);
  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Register or login a user via Google Sign-In.
 * @param {string} idToken - Firebase ID token from the client
 * @returns {Promise<{user: object, token: string, isNewUser: boolean}>}
 */
async function loginWithGoogle(idToken) {
  const decoded = await verifyGoogleToken(idToken);
  const { uid, email, name, picture } = decoded;

  // Check if user exists by firebase_uid or email
  let result = await query(
    'SELECT * FROM users WHERE firebase_uid = $1 OR email = $2',
    [uid, email]
  );

  if (result.rows.length > 0) {
    // Existing user — if firebase_uid was null, link it
    const user = result.rows[0];
    if (!user.firebase_uid) {
      await query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [uid, user.id]);
    }
    const token = generateToken(user.id);
    return { user: sanitizeUser(user), token, isNewUser: false };
  }

  // New user — create account & auto verify email
  const username = await generateUniqueUsername(email, name);
  result = await query(
    `INSERT INTO users (firebase_uid, email, username, display_name, avatar_url, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [uid, email, username, name || email.split('@')[0], picture || null]
  );

  const user = result.rows[0];
  const token = generateToken(user.id);
  return { user: sanitizeUser(user), token, isNewUser: true };
}

/**
 * Send OTP Email Helper
 */
async function sendOtpEmail(toEmail, displayName, otpCode) {
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #2D2D2D; background-color: #F8F5EE; border-radius: 12px; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #4B6F44; text-align: center; margin-top: 0;">🌿 Verifikasi Akun Jeda</h2>
      <p>Halo <b>${displayName}</b>,</p>
      <p>Gunakan kode OTP berikut untuk memverifikasi akun Jeda kamu:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4B6F44; background: #E8EFE5; padding: 14px 28px; border-radius: 10px; border: 1px dashed #87A878;">
          ${otpCode}
        </span>
      </div>
      <p style="font-size: 13px; color: #666; text-align: center;">Kode OTP ini berlaku selama <b>10 menit</b>. Jangan berikan kode ini kepada siapapun.</p>
      <hr style="border: none; border-top: 1px solid #E0D9C8; margin: 24px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">Jika kamu tidak merasa mendaftar di Jeda, abaikan email ini.</p>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `🌿 [${otpCode}] Kode Verifikasi Akun Jeda`,
    html: htmlContent,
  });
}

/**
 * Generate a unique username from email or display name.
 */
async function generateUniqueUsername(email, name) {
  let base = (name || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20);

  if (!base) base = 'user';

  let username = base;
  let counter = 1;

  while (true) {
    const check = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (check.rows.length === 0) return username;
    username = `${base}${counter}`;
    counter++;
  }
}

/**
 * Remove sensitive fields from user object.
 */
function sanitizeUser(user) {
  const { firebase_uid, password_hash, otp_code, otp_expires, email_verify_token, email_verify_expires, ...safe } = user;
  return safe;
}

module.exports = {
  registerManual,
  verifyOtp,
  resendOtp,
  loginManual,
  loginWithGoogle,
};
