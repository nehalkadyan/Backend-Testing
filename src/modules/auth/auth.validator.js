'use strict';

const { body, query } = require('express-validator');

const validate = {
  register: [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ max: 50 }).withMessage('First name too long'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ max: 50 }).withMessage('Last name too long'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    body('mfaToken')
      .optional()
      .isLength({ min: 6, max: 6 }).withMessage('MFA token must be 6 digits')
      .isNumeric().withMessage('MFA token must be numeric'),
  ],

  refreshToken: [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required'),
  ],

  verifyEmail: [
    query('token')
      .notEmpty().withMessage('Verification token is required'),
  ],

  resendVerification: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
  ],

  forgotPassword: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
  ],

  resetPassword: [
    body('token')
      .notEmpty().withMessage('Reset token is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ],

  verifyMfa: [
    body('token')
      .notEmpty().withMessage('TOTP token is required')
      .isLength({ min: 6, max: 6 }).withMessage('TOTP token must be 6 digits')
      .isNumeric().withMessage('TOTP token must be numeric'),
  ],

  disableMfa: [
    body('token')
      .notEmpty().withMessage('TOTP token is required')
      .isLength({ min: 6, max: 6 }).withMessage('TOTP token must be 6 digits')
      .isNumeric().withMessage('TOTP token must be numeric'),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
};

module.exports = { validate };
