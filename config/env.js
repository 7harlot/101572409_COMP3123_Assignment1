// Single place that reads process.env. Every other file imports `config` from here,
// so a missing or weak setting is caught once, at startup, instead of deep inside a request.
require('dotenv').config({ quiet: true });

const MIN_JWT_SECRET_LENGTH = 32;

function readRequired(variableName) {
    const value = process.env[variableName];
    if (!value || value.trim() === '') {
        throw new Error(`${variableName} is not set. Copy .env.example to .env and fill it in.`);
    }
    return value.trim();
}

function loadConfig() {
    const jwtSecret = readRequired('JWT_SECRET');
    // A short secret can be brute-forced offline from any token, which lets an attacker forge logins
    if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`);
    }

    return Object.freeze({
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT) || 3000,
        mongodbUri: readRequired('MONGODB_URI'),
        // The assignment requires this exact database name, so it is fixed here rather than read from .env
        dbName: 'comp3123_assignment1',
        jwtSecret,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
        logLevel: process.env.LOG_LEVEL || 'info',
    });
}

module.exports = loadConfig();
