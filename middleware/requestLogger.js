const logger = require('../utils/logger');

// Logs one line per request once the response has been sent, so the status code is known.
// Deliberately NOT logged: request bodies (passwords), the Authorization header (JWTs), query secrets.
function requestLogger(req, res, next) {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger.log(logLevel, 'HTTP request', {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs),
            ip: req.ip,
            userId: req.user ? req.user.id : undefined, // set by the auth middleware on protected routes
        });
    });

    next();
}

module.exports = requestLogger;
