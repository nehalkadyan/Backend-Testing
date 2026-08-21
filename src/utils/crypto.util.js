'use strict';

const crypto = require('crypto');

/**
 * Generates a cryptographically secure random hex token.
 * @param {number} bytes - number of random bytes (default: 32)
 */
const generateSecureToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/**
 * SHA-256 hashes a token for safe DB storage.
 * @param {string} token
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Constant-time comparison to prevent timing attacks.
 */
const safeCompare = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

module.exports = { generateSecureToken, hashToken, safeCompare };
