'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const MONGO_OPTIONS = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

/**
 * Establishes a connection to MongoDB with retry logic.
 */
const connectDB = async (retries = 5, delay = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(env.MONGO_URI, MONGO_OPTIONS);
            logger.info(`MongoDB connected: ${mongoose.connection.host}`);
            return;
        } catch (err) {
            logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) {
                logger.info(`Retrying in ${delay / 1000}s...`);
                await new Promise((res) => setTimeout(res, delay));
            } else {
                logger.error('All MongoDB connection attempts exhausted. Shutting down.');
                process.exit(1);
            }
        }
    }
};

mongoose.set('strictQuery', true);
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

const gracefulDisconnect = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed (graceful shutdown)');
};

module.exports = { connectDB, gracefulDisconnect };
