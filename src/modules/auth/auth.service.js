'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../../models/user.model');
const Token = require('../../models/token.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt.util');
const { generateSecureToken, hashToken } = require('../../utils/crypto.util');
const { generateTotpSecret, verifyTotpToken } = require('../../utils/totp.util');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} = require('../../utils/email.util');
const { AppError } = require('../../middlewares/errorHandler');
const env = require('../../config/env');
const logger = require('../../config/logger');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Issues both access and refresh tokens, persists the hashed refresh token.
 */
const issueTokenPair = async (userId, { userAgent = 'unknown', ipAddress = 'unknown' } = {}) => {
  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: userId, jti });
  const refreshToken = signRefreshToken({ sub: userId, jti });
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRES_DAYS);

  await Token.create({
    user: userId,
    tokenHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const AuthService = {
  /**
   * Registers a new user and sends an email verification link.
   */
  async register(dto) {
    const { firstName, lastName, email, password } = dto;

    // Check uniqueness
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');

    // Generate email verification token (store hash, send raw)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const tokenExpires = new Date(Date.now() + env.EMAIL_VERIFY_TOKEN_EXPIRES_MS);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpires: tokenExpires,
    });

    // Fire-and-forget email (don't block response)
    sendVerificationEmail(email, rawToken).catch((err) =>
      logger.error(`Verification email failed: ${err.message}`)
    );

    return user.toSafeObject();
  },

  /**
   * Authenticates a user and returns a JWT token pair.
   */
  async login(dto, requestMeta) {
    const { email, password, mfaToken } = dto;

    // Fetch user with sensitive fields
    const user = await User.findOne({ email }).select(
      '+password +failedLoginAttempts +lockUntil +mfaEnabled +mfaSecret'
    );

    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (!user.isActive) throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');

    // Check lockout
    if (user.isLocked) {
      throw new AppError(
        `Account is temporarily locked. Try again after ${env.LOCK_TIME_MINUTES} minutes.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incFailedAttempts();
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaToken) throw new AppError('MFA token required', 400, 'MFA_REQUIRED');
      const isMfaValid = verifyTotpToken(user.mfaSecret, mfaToken);
      if (!isMfaValid) {
        await user.incFailedAttempts();
        throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
      }
    }

    // Reset failed attempts on successful login
    await user.resetFailedAttempts();

    const tokens = await issueTokenPair(user._id, requestMeta);
    return { user: user.toSafeObject(), tokens };
  },

  /**
   * Revokes a single refresh token (logout current session).
   */
  async logout(rawRefreshToken) {
    if (!rawRefreshToken) throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');
    const tokenHash = hashToken(rawRefreshToken);
    const result = await Token.deleteOne({ tokenHash });
    if (result.deletedCount === 0) throw new AppError('Token not found or already revoked', 404, 'TOKEN_NOT_FOUND');
  },

  /**
   * Revokes all refresh tokens for a user (logout all sessions).
   */
  async logoutAll(userId) {
    await Token.deleteMany({ user: userId });
  },

  /**
   * Rotates the refresh token pair (silent token refresh).
   */
  async refreshTokens(rawRefreshToken, requestMeta) {
    if (!rawRefreshToken) throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await Token.findOne({ tokenHash, isRevoked: false });
    if (!storedToken) {
      // Possible reuse attack — revoke all sessions for safety
      await Token.deleteMany({ user: decoded.sub });
      throw new AppError('Refresh token reuse detected. All sessions revoked.', 401, 'TOKEN_REUSE');
    }

    // Revoke old token
    await Token.deleteOne({ _id: storedToken._id });

    // Issue new pair
    const tokens = await issueTokenPair(decoded.sub, requestMeta);
    return tokens;
  },

  /**
   * Verifies the email verification token.
   */
  async verifyEmail(rawToken) {
    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
  },

  /**
   * Resends the email verification link.
   */
  async resendVerificationEmail(email) {
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationTokenExpires');
    if (!user) throw new AppError('No account found with this email', 404, 'USER_NOT_FOUND');
    if (user.isEmailVerified) throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    user.emailVerificationToken = tokenHash;
    user.emailVerificationTokenExpires = new Date(Date.now() + env.EMAIL_VERIFY_TOKEN_EXPIRES_MS);
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(email, rawToken).catch((err) =>
      logger.error(`Resend verification email failed: ${err.message}`)
    );
  },

  /**
   * Sends a password reset link.
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    // Always respond generically to avoid user enumeration
    if (!user) return;

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    user.passwordResetToken = tokenHash;
    user.passwordResetTokenExpires = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRES_MS);
    await user.save({ validateBeforeSave: false });

    sendPasswordResetEmail(email, rawToken).catch((err) =>
      logger.error(`Password reset email failed: ${err.message}`)
    );
  },

  /**
   * Resets the user's password using the reset token.
   */
  async resetPassword(rawToken, newPassword) {
    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetTokenExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save();

    // Invalidate all sessions after password reset
    await Token.deleteMany({ user: user._id });

    sendPasswordChangedEmail(user.email).catch(() => {});
  },

  /**
   * Changes the password for an authenticated user.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

    user.password = newPassword;
    await user.save();

    // Invalidate all other sessions
    await Token.deleteMany({ user: userId });

    sendPasswordChangedEmail(user.email).catch(() => {});
  },

  /**
   * Generates a TOTP secret and QR code for MFA enrollment.
   */
  async enableMfa(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.mfaEnabled) throw new AppError('MFA is already enabled', 400, 'MFA_ALREADY_ENABLED');

    const { secret, otpauthUrl, qrCodeDataUrl } = await generateTotpSecret(user.email);

    // Store temp secret — only activated after verifyMfa confirms it
    user.mfaSecret = secret;
    await user.save({ validateBeforeSave: false });

    return { otpauthUrl, qrCodeDataUrl };
  },

  /**
   * Confirms the TOTP token and activates MFA.
   */
  async verifyMfa(userId, token) {
    const user = await User.findById(userId).select('+mfaSecret');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.mfaEnabled) throw new AppError('MFA is already enabled', 400, 'MFA_ALREADY_ENABLED');
    if (!user.mfaSecret) throw new AppError('MFA enrollment not started. Call /mfa/enable first.', 400, 'MFA_NOT_INITIATED');

    const isValid = verifyTotpToken(user.mfaSecret, token);
    if (!isValid) throw new AppError('Invalid TOTP token', 400, 'INVALID_MFA_TOKEN');

    user.mfaEnabled = true;
    await user.save({ validateBeforeSave: false });
  },

  /**
   * Disables MFA after verifying password + current TOTP code.
   */
  async disableMfa(userId, password, token) {
    const user = await User.findById(userId).select('+password +mfaSecret +mfaEnabled');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (!user.mfaEnabled) throw new AppError('MFA is not enabled', 400, 'MFA_NOT_ENABLED');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');

    const isMfaValid = verifyTotpToken(user.mfaSecret, token);
    if (!isMfaValid) throw new AppError('Invalid TOTP token', 400, 'INVALID_MFA_TOKEN');

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save({ validateBeforeSave: false });
  },

  /**
   * Lists all active sessions for a user.
   */
  async listSessions(userId) {
    const sessions = await Token.find({ user: userId, isRevoked: false })
      .select('_id userAgent ipAddress createdAt expiresAt')
      .sort({ createdAt: -1 });
    return sessions;
  },

  /**
   * Revokes a specific session by its token document ID.
   */
  async revokeSession(userId, sessionId) {
    const result = await Token.deleteOne({ _id: sessionId, user: userId });
    if (result.deletedCount === 0) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  },
};

module.exports = AuthService;
