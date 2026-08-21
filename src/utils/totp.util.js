'use strict';

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Generates a new TOTP secret for a user.
 * Returns { secret (base32), otpauthUrl, qrCodeDataUrl }
 */
const generateTotpSecret = async (userEmail, appName = 'EnterpriseAuth') => {
    const secret = speakeasy.generateSecret({
        name: `${appName} (${userEmail})`,
        length: 20,
    });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCodeDataUrl,
    };
};

/**
 * Verifies a TOTP token against a stored secret.
 * Uses a window of 1 step (30s before/after) for clock drift tolerance.
 */
const verifyTotpToken = (secret, token) =>
    speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1,
    });

module.exports = { generateTotpSecret, verifyTotpToken };
