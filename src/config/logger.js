'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isProduction = process.env.NODE_ENV === 'production';

const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length) log += ` ${JSON.stringify(meta)}`;
        if (stack) log += `\n${stack}`;
        return log;
    })
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug'),
    format: isProduction ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        ...(isProduction
            ? [
                new transports.File({ filename: path.join('logs', 'error.log'), level: 'error' }),
                new transports.File({ filename: path.join('logs', 'combined.log') }),
            ]
            : []),
    ],
    exitOnError: false,
});

module.exports = logger;
