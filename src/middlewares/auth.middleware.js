'use strict';

const { verifyAccessToken } = require('../utils/jwt.util');
const { AppError } = require('./errorHandler');
const User = require('../models/user.model');

/**
 * Protects routes — validates the Bearer access token in the Authorization header.
 * Attaches req.user with the full user document (password excluded).
 */
const protect = async (req, res, next) => {
    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('Access token required', 401, 'MISSING_TOKEN'));
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(new AppError('Access token required', 401, 'MISSING_TOKEN'));
        }

        // 2. Verify token signature and expiry
        const decoded = verifyAccessToken(token);

        // 3. Confirm user still exists and is active
        const user = await User.findById(decoded.sub).select('+passwordChangedAt');
        if (!user) {
            return next(new AppError('User no longer exists', 401, 'USER_NOT_FOUND'));
        }
        if (!user.isActive) {
            return next(new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED'));
        }

        // 4. Check if password was changed after the token was issued
        if (user.passwordChangedAt) {
            const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedAt) {
                return next(new AppError('Password recently changed. Please log in again.', 401, 'TOKEN_STALE'));
            }
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { protect };
