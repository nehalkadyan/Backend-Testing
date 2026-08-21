'use strict';

require('dotenv').config();

const env = {
    // ── Server ───────────────────────────────────────────────────────────────
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 5000,

    // ── Database ─────────────────────────────────────────────────────────────
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/enterprise_auth',

    // ── JWT ──────────────────────────────────────────────────────────────────
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret_min_32_chars!!',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret_min_32_chars!',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS, 10) || 7,

    // ── Email ─────────────────────────────────────────────────────────────────
    EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@enterprise.local',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Enterprise Auth',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
    SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',

    // ── App URLs ──────────────────────────────────────────────────────────────
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',

    // ── Security ──────────────────────────────────────────────────────────────
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    LOCK_TIME_MINUTES: parseInt(process.env.LOCK_TIME_MINUTES, 10) || 15,

    // ── Token TTLs (milliseconds) ─────────────────────────────────────────────
    EMAIL_VERIFY_TOKEN_EXPIRES_MS: parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES_MS, 10) || 24 * 60 * 60 * 1000,
    PASSWORD_RESET_TOKEN_EXPIRES_MS: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MS, 10) || 60 * 60 * 1000,

    // ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),

    // ── Rate Limits ───────────────────────────────────────────────────────────
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
};

module.exports = env;
