const { rateLimit } = require('express-rate-limit');
const logger = require('../utils/logger');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Every limiter answers the same way when the limit is hit: 429 + JSON + a log line.
// The RateLimit-* and Retry-After headers tell the client how long to wait.
function createLimiter({ name, windowMs, limit, message }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler(req, res, next, options) {
            logger.warn('Rate limit exceeded', { limiter: name, ip: req.ip, method: req.method, path: req.originalUrl });
            res.status(options.statusCode).json({ status: false, message });
        },
    });
}

// Login + signup share one counter per IP: tight, because these are what password-guessing scripts hammer.
// AUTH_RATE_LIMIT_MAX can be lowered in .env to demo the 429 quickly.
const authLimiter = createLimiter({
    name: 'auth',
    windowMs: FIFTEEN_MINUTES_MS,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

module.exports = { authLimiter, createLimiter, FIFTEEN_MINUTES_MS };
