'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const userSchema = new mongoose.Schema(
    {
        // ── Identity ─────────────────────────────────────────────
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },

        // ── Credentials ──────────────────────────────────────────
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },

        // ── Status ───────────────────────────────────────────────
        isEmailVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },

        // ── Account Lockout ───────────────────────────────────────
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null },

        // ── Email Verification ────────────────────────────────────
        emailVerificationToken: { type: String, select: false },
        emailVerificationTokenExpires: { type: Date, select: false },

        // ── Password Reset ────────────────────────────────────────
        passwordResetToken: { type: String, select: false },
        passwordResetTokenExpires: { type: Date, select: false },
        passwordChangedAt: { type: Date, select: false },

        // ── MFA / TOTP ────────────────────────────────────────────
        mfaEnabled: { type: Boolean, default: false },
        mfaSecret: { type: String, select: false },
        mfaBackupCodes: { type: [String], select: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Virtuals ────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Pre-save: Hash password ──────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
    if (!this.isNew) {
        this.passwordChangedAt = new Date(Date.now() - 1000);
    }
    next();
});

// ── Instance methods ─────────────────────────────────────────────────────────
/**
 * Compares a candidate password with the stored hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Increments failed login attempts and applies a lockout when the threshold is reached.
 */
userSchema.methods.incFailedAttempts = async function () {
    const MAX = env.MAX_LOGIN_ATTEMPTS;
    const LOCK_MS = env.LOCK_TIME_MINUTES * 60 * 1000;

    // Reset expired locks
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { failedLoginAttempts: 1, lockUntil: null },
        });
    }

    const update = { $inc: { failedLoginAttempts: 1 } };
    if (this.failedLoginAttempts + 1 >= MAX && !this.isLocked) {
        update.$set = { lockUntil: new Date(Date.now() + LOCK_MS) };
    }
    return this.updateOne(update);
};

/**
 * Resets failed login attempts and clears the lock.
 */
userSchema.methods.resetFailedAttempts = async function () {
    return this.updateOne({
        $set: { failedLoginAttempts: 0, lockUntil: null },
    });
};

/**
 * Returns a safe public representation (no sensitive fields).
 */
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        fullName: this.fullName,
        email: this.email,
        isEmailVerified: this.isEmailVerified,
        isActive: this.isActive,
        mfaEnabled: this.mfaEnabled,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
