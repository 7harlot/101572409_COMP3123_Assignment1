const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

// Connects once at startup. dbName overrides whatever database is in the URI,
// so every environment writes to comp3123_assignment1.
async function connectDatabase() {
    await mongoose.connect(config.mongodbUri, { dbName: config.dbName });
    logger.info('Connected to MongoDB', { database: config.dbName });

    // Log (but don't crash on) connection drops after startup; Mongoose reconnects on its own
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

// Human-readable connection state for the health check (0..3 are Mongoose's readyState values)
const READY_STATE_NAMES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

function getDatabaseState() {
    return READY_STATE_NAMES[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDatabase, getDatabaseState };
