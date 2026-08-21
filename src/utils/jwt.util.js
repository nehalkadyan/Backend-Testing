'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a short-lived access token.
 */
const signAccessToken = (payload) =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

/**
 * Signs a long-lived refresh token.
 */
const signRefreshToken = (payload) =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

/**
 * Verifies an access token. Returns decoded payload or throws.
 */
const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

/**
 * Verifies a refresh token. Returns decoded payload or throws.
 */
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
