const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Public Auth Endpoints
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/google', authController.loginGoogle);

// Protected Auth Endpoints
router.get('/me', authenticate, authController.getMe);

module.exports = router;
