const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { verifyToken } = require('../services/authService');

// Rejects with 401 and logs why (without the token itself).
// WWW-Authenticate tells the client which auth scheme this API expects.
function rejectUnauthenticated(req, res, reason, clientMessage) {
    logger.warn('Authentication failed', { reason, method: req.method, path: req.originalUrl, ip: req.ip });
    res.set('WWW-Authenticate', 'Bearer');
    throw new ApiError(401, clientMessage);
}

// Protects a route: expects "Authorization: Bearer <jwt>".
// On success it sets req.user = { id, username } taken from the VERIFIED token,
// which is the only place employee ownership is ever read from.
async function authenticate(req, res, next) {
    const authorizationHeader = req.get('Authorization');
    if (!authorizationHeader) {
        rejectUnauthenticated(req, res, 'missing token', 'Authentication required: missing Authorization header');
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        rejectUnauthenticated(req, res, 'malformed header', 'Authorization header must be in the format: Bearer <token>');
    }

    let payload;
    try {
        payload = verifyToken(token); // checks signature AND expiry
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            rejectUnauthenticated(req, res, 'expired token', 'Token has expired, please log in again');
        }
        rejectUnauthenticated(req, res, 'invalid token', 'Invalid token');
    }

    // A validly signed token for a user that has since been deleted must not keep working
    const user = await User.findById(payload.sub).lean();
    if (!user) {
        rejectUnauthenticated(req, res, 'user no longer exists', 'Invalid token');
    }

    req.user = { id: user._id.toString(), username: user.username };
    next();
}

module.exports = authenticate;
