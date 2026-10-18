const { rateLimit } = require('express-rate-limit');
const logger = require('../utils/logger');

// All counters are kept in memory per client IP, so restarting the server resets them.
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Every limiter answers the same way when the limit is hit: 429 + JSON + a log line.
// The RateLimit-* and Retry-After headers tell the client how long to wait.
function createLimiter({ name, windowMs, limit, message, skipSuccessfulRequests = false }) {
    return rateLimit({
        windowMs,
        limit,
        skipSuccessfulRequests,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler(req, res, next, options) {
            logger.warn('Rate limit exceeded', { limiter: name, ip: req.ip, method: req.method, path: req.originalUrl });
            res.status(options.statusCode).json({ status: false, message });
        },
    });
}

// Login: only FAILED attempts count, so a real user logging in normally is never blocked,
// but a script guessing passwords is stopped after a handful of tries.
const loginLimiter = createLimiter({
    name: 'login',
    windowMs: FIFTEEN_MINUTES_MS,
    limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts. Please try again in 15 minutes.',
});

// Signup: every attempt counts, to stop mass account creation.
const signupLimiter = createLimiter({
    name: 'signup',
    windowMs: FIFTEEN_MINUTES_MS,
    limit: Number(process.env.SIGNUP_RATE_LIMIT_MAX) || 20,
    message: 'Too many signup attempts. Please try again in 15 minutes.',
});

// Every /api route: generous, just stops one client from flooding the API (scripts, runaway loops).
const apiLimiter = createLimiter({
    name: 'api',
    windowMs: FIFTEEN_MINUTES_MS,
    limit: Number(process.env.API_RATE_LIMIT_MAX) || 100,
    message: 'Too many requests. Please try again in 15 minutes.',
});

module.exports = { loginLimiter, signupLimiter, apiLimiter };
