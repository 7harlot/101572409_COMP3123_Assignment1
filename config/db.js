const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

// Connects to MongoDB. Safe to call many times: the first call starts the connection and
// every later call reuses the same promise. That matters on Vercel, where each request may
// run in a fresh or a reused function instance (see api/index.js).
// dbName overrides whatever database is in the URI, so every environment writes to comp3123_assignment1.
let connectionPromise = null;

function connectDatabase() {
    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(config.mongodbUri, { dbName: config.dbName })
            .then(() => {
                logger.info('Connected to MongoDB', { database: config.dbName });
                // Log (but don't crash on) connection drops; Mongoose reconnects on its own
                mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
                mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
            })
            .catch((error) => {
                connectionPromise = null; // let the next call try again instead of caching the failure
                throw error;
            });
    }
    return connectionPromise;
}

// Human-readable connection state for the health check (0..3 are Mongoose's readyState values)
const READY_STATE_NAMES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

function getDatabaseState() {
    return READY_STATE_NAMES[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDatabase, getDatabaseState };
