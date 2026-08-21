'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Global rate limiter — applied to all routes.
 */
const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
    },
});

/**
 * Strict rate limiter for sensitive auth routes (login, register, etc.).
 */
const authLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});

module.exports = { globalLimiter, authLimiter };
