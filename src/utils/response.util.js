'use strict';

/**
 * Sends a standardised success response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object} [data]
 * @param {object} [meta]  - pagination, counts etc.
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
    const payload = { success: true, message };
    if (data !== null) payload.data = data;
    if (meta !== null) payload.meta = meta;
    return res.status(statusCode).json(payload);
};

/**
 * Sends a standardised error response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {string} [errorCode]  - machine-readable code
 * @param {object} [errors]     - field-level validation errors
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errorCode = null, errors = null) => {
    const payload = { success: false, message };
    if (errorCode) payload.errorCode = errorCode;
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
