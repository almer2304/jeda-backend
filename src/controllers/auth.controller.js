const authService = require('../services/auth.service');

/**
 * Register Manual (Email, Username, Password, Display Name)
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, username, password, display_name } = req.body;
    const result = await authService.registerManual({
      email,
      username,
      password,
      display_name,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Verifikasi Kode OTP (Langsung mengembalikan JWT token login)
 * POST /api/auth/verify-otp
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp_code } = req.body;
    const result = await authService.verifyOtp(email, otp_code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Minta Kirim Ulang OTP
 * POST /api/auth/resend-otp
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.resendOtp(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Login Manual (Email/Username + Password)
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { identifier, email, username, password } = req.body;
    const userIdentifier = identifier || email || username;

    const result = await authService.loginManual(userIdentifier, password);
    res.json({
      message: 'Login berhasil',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

/**
 * Login / Register with Google Sign-In (Firebase ID Token)
 * POST /api/auth/google
 */
async function loginGoogle(req, res, next) {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: 'id_token wajib diisi' });
    }

    const result = await authService.loginWithGoogle(id_token);
    res.json({
      message: result.isNewUser ? 'Registrasi berhasil' : 'Login berhasil',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ error: 'Autentikasi Google gagal', details: error.message });
  }
}

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  loginGoogle,
  getMe,
};
