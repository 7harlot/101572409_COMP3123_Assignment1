const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/env');

// Pinning the algorithm stops "alg: none" and algorithm-confusion tricks on verify
const JWT_ALGORITHM = 'HS256';

// Used when the username/email doesn't exist, so a failed login takes the same time either way.
// Without it, a fast "no such user" vs a slow bcrypt compare tells attackers which accounts exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

async function registerUser({ username, email, password }) {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (existingUser) {
        const takenField = existingUser.username === username ? 'username' : 'email';
        logger.warn('Signup rejected: duplicate', { field: takenField });
        throw new ApiError(409, `A user with this ${takenField} already exists`);
    }

    // Password is hashed by the pre('save') hook in models/User.js
    const user = await User.create({ username, email, password });
    logger.info('Signup succeeded', { userId: user.id, username: user.username });
    return user;
}

function signToken(user) {
    return jwt.sign({ username: user.username }, config.jwtSecret, {
        subject: user.id, // standard "sub" claim = the user's id; the auth middleware reads it back
        expiresIn: config.jwtExpiresIn,
        algorithm: JWT_ALGORITHM,
    });
}

function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALGORITHM] });
}

async function loginUser({ username, email, password }) {
    // If both are sent, email wins (it's the more specific identifier)
    const identifierQuery = email ? { email } : { username };
    const user = await User.findOne(identifierQuery).select('+password');

    const isPasswordCorrect = user
        ? await user.isPasswordCorrect(password)
        : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

    if (!user || !isPasswordCorrect) {
        // Same message for "no such user" and "wrong password", so accounts can't be enumerated
        logger.warn('Login failed', { identifier: email || username, reason: user ? 'wrong password' : 'unknown user' });
        throw new ApiError(401, 'Invalid username/email or password');
    }

    logger.info('Login succeeded', { userId: user.id });
    return { user, token: signToken(user) };
}

module.exports = { registerUser, loginUser, verifyToken };
