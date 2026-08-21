'use strict';

const mongoose = require('mongoose');

/**
 * Stores hashed refresh tokens (one document = one device session).
 * TTL index auto-expires documents after `expiresAt`.
 */
const tokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        userAgent: { type: String, default: 'unknown' },
        ipAddress: { type: String, default: 'unknown' },
        isRevoked: { type: Boolean, default: false },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// ── TTL index: MongoDB will auto-delete expired tokens ───────────────────────
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user: 1 });
tokenSchema.index({ tokenHash: 1 });

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;
