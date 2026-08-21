'use strict';

const { validationResult } = require('express-validator');
const AuthService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

/**
 * Extracts request metadata (user-agent, IP) for session tracking.
 */
const getRequestMeta = (req) => ({
  userAgent: req.headers['user-agent'] || 'unknown',
  ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
});

/**
 * Validates express-validator results and short-circuits with 422 on failure.
 */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    return false;
  }
  return true;
};

const AuthController = {
  // POST /register
  async register(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      const user = await AuthService.register(req.body);
      sendSuccess(res, 201, 'Registration successful. Please verify your email.', { user });
    } catch (err) { next(err); }
  },

  // POST /login
  async login(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      const { user, tokens } = await AuthService.login(req.body, getRequestMeta(req));
      sendSuccess(res, 200, 'Login successful', { user, tokens });
    } catch (err) { next(err); }
  },

  // POST /logout
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      sendSuccess(res, 200, 'Logged out successfully');
    } catch (err) { next(err); }
  },

  // POST /logout-all
  async logoutAll(req, res, next) {
    try {
      await AuthService.logoutAll(req.user._id);
      sendSuccess(res, 200, 'All sessions terminated');
    } catch (err) { next(err); }
  },

  // POST /refresh-token
  async refreshToken(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      const tokens = await AuthService.refreshTokens(req.body.refreshToken, getRequestMeta(req));
      sendSuccess(res, 200, 'Tokens refreshed', { tokens });
    } catch (err) { next(err); }
  },

  // GET /verify-email?token=
  async verifyEmail(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.verifyEmail(req.query.token);
      sendSuccess(res, 200, 'Email verified successfully');
    } catch (err) { next(err); }
  },

  // POST /resend-verification
  async resendVerification(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.resendVerificationEmail(req.body.email);
      sendSuccess(res, 200, 'If an account exists and is unverified, a new verification email has been sent.');
    } catch (err) { next(err); }
  },

  // POST /forgot-password
  async forgotPassword(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.forgotPassword(req.body.email);
      // Always generic response to prevent user enumeration
      sendSuccess(res, 200, 'If an account exists with this email, a password reset link has been sent.');
    } catch (err) { next(err); }
  },

  // POST /reset-password
  async resetPassword(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, 200, 'Password reset successfully. All sessions have been terminated.');
    } catch (err) { next(err); }
  },

  // PUT /change-password
  async changePassword(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
      sendSuccess(res, 200, 'Password changed successfully. All sessions have been terminated.');
    } catch (err) { next(err); }
  },

  // GET /me
  async getMe(req, res, next) {
    try {
      sendSuccess(res, 200, 'User profile', { user: req.user.toSafeObject() });
    } catch (err) { next(err); }
  },

  // POST /mfa/enable
  async enableMfa(req, res, next) {
    try {
      const result = await AuthService.enableMfa(req.user._id);
      sendSuccess(res, 200, 'Scan the QR code with your authenticator app, then confirm with /mfa/verify', result);
    } catch (err) { next(err); }
  },

  // POST /mfa/verify
  async verifyMfa(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.verifyMfa(req.user._id, req.body.token);
      sendSuccess(res, 200, 'MFA enabled successfully');
    } catch (err) { next(err); }
  },

  // POST /mfa/disable
  async disableMfa(req, res, next) {
    try {
      if (!handleValidation(req, res)) return;
      await AuthService.disableMfa(req.user._id, req.body.password, req.body.token);
      sendSuccess(res, 200, 'MFA disabled successfully');
    } catch (err) { next(err); }
  },

  // GET /sessions
  async listSessions(req, res, next) {
    try {
      const sessions = await AuthService.listSessions(req.user._id);
      sendSuccess(res, 200, 'Active sessions', { sessions, count: sessions.length });
    } catch (err) { next(err); }
  },

  // DELETE /sessions/:id
  async revokeSession(req, res, next) {
    try {
      await AuthService.revokeSession(req.user._id, req.params.id);
      sendSuccess(res, 200, 'Session revoked successfully');
    } catch (err) { next(err); }
  },
};

module.exports = AuthController;
