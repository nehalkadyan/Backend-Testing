'use strict';

const app = require('./src/app');
const { connectDB, gracefulDisconnect } = require('./src/config/database');
const env = require('./src/config/env');
const logger = require('./src/config/logger');

const PORT = env.PORT;
let server;

const start = async () => {
    // await connectDB();

    server = app.listen(PORT, () => {
        logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
        logger.info(`Health: http://localhost:${PORT}/health`);
        logger.info(`Auth API: http://localhost:${PORT}/api/v1/auth`);
    });
};

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');
            await gracefulDisconnect();
            process.exit(0);
        });
    } else {
        await gracefulDisconnect();
        process.exit(0);
    }
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
});

start();
