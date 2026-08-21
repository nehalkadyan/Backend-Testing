'use strict';

const express = require('express');
const AuthController = require('./auth.controller');
const { validate } = require('./auth.validator');
const { protect } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();

// ── Public routes (no auth required) ─────────────────────────────────────────
router.post('/register',             authLimiter, validate.register,             AuthController.register);
router.post('/login',                authLimiter, validate.login,                AuthController.login);
router.post('/refresh-token',        authLimiter, validate.refreshToken,         AuthController.refreshToken);
router.get('/verify-email',                       validate.verifyEmail,           AuthController.verifyEmail);
router.post('/resend-verification',  authLimiter, validate.resendVerification,   AuthController.resendVerification);
router.post('/forgot-password',      authLimiter, validate.forgotPassword,       AuthController.forgotPassword);
router.post('/reset-password',       authLimiter, validate.resetPassword,        AuthController.resetPassword);

// ── Protected routes (Bearer token required) ──────────────────────────────────
router.post('/logout',               protect, AuthController.logout);
router.post('/logout-all',           protect, AuthController.logoutAll);
router.put('/change-password',       protect, validate.changePassword,           AuthController.changePassword);
router.get('/me',                    protect, AuthController.getMe);

// MFA
router.post('/mfa/enable',           protect, AuthController.enableMfa);
router.post('/mfa/verify',           protect, validate.verifyMfa,                AuthController.verifyMfa);
router.post('/mfa/disable',          protect, validate.disableMfa,               AuthController.disableMfa);

// Sessions
router.get('/sessions',              protect, AuthController.listSessions);
router.delete('/sessions/:id',       protect, AuthController.revokeSession);

module.exports = router;
