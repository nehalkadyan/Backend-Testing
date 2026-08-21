'use strict';

const logger = require('../config/logger');

/**
 * Custom application error class.
 */
class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handles Mongoose CastError (invalid ObjectId etc.)
 */
const handleCastError = (err) =>
    new AppError(`Invalid value for field: ${err.path}`, 400, 'INVALID_INPUT');

/**
 * Handles Mongoose duplicate key error.
 */
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`${field} already exists`, 409, 'DUPLICATE_FIELD');
};

/**
 * Handles Mongoose validation errors.
 */
const handleValidationError = (err) => {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new AppError(messages.join('. '), 422, 'VALIDATION_ERROR');
};

/**
 * Handles JWT errors.
 */
const handleJWTError = () => new AppError('Invalid token', 401, 'INVALID_TOKEN');
const handleJWTExpiredError = () => new AppError('Token has expired', 401, 'TOKEN_EXPIRED');

/**
 * Global Express error-handling middleware.
 */
const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!error.isOperational) {
        // Map known library errors to operational AppErrors
        if (err.name === 'CastError') error = handleCastError(err);
        else if (err.code === 11000) error = handleDuplicateKeyError(err);
        else if (err.name === 'ValidationError') error = handleValidationError(err);
        else if (err.name === 'JsonWebTokenError') error = handleJWTError();
        else if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
        else {
            logger.error('Unhandled error:', err);
            error = new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
        }
    }

    const statusCode = error.statusCode || 500;
    const payload = {
        success: false,
        message: error.message,
        errorCode: error.errorCode || 'INTERNAL_ERROR',
    };

    if (process.env.NODE_ENV !== 'production') {
        payload.stack = err.stack;
    }

    return res.status(statusCode).json(payload);
};

/**
 * 404 Not Found handler — must be registered before errorHandler.
 */
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

module.exports = { AppError, errorHandler, notFoundHandler };
