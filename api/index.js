// Vercel entry point. Vercel doesn't run server.js (no long-running process, no app.listen);
// instead it calls this exported function once per request.
// We make sure MongoDB is connected (reusing the connection if this instance already has one),
// then hand the request to the same Express app used locally.
require('../config/env'); // loads and checks environment variables first
const app = require('../app');
const { connectDatabase } = require('../config/db');
const logger = require('../utils/logger');

module.exports = async function vercelHandler(req, res) {
    try {
        await connectDatabase();
    } catch (error) {
        // Never include the error details: they can contain the connection string
        logger.error('Database connection failed', { error: error.message });
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ status: false, message: 'Database unavailable, please try again shortly' }));
    }
    return app(req, res);
};
