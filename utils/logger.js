const path = require('path');
const winston = require('winston');

// Logs go to two files in /logs (one JSON object per line) plus the console:
//   logs/app.log   -> everything at LOG_LEVEL and above
//   logs/error.log -> errors only, so failures are easy to find
// Note: this file reads LOG_LEVEL directly instead of importing config/env.js,
// so the logger still works when config itself fails to load.
const LOG_DIRECTORY = path.join(__dirname, '..', 'logs');
const logLevel = process.env.LOG_LEVEL || 'info';

const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...details }) => {
        const extra = Object.keys(details).length ? ` ${JSON.stringify(details)}` : '';
        return `${timestamp} ${level}: ${message}${extra}`;
    })
);

const logger = winston.createLogger({
    level: logLevel,
    transports: [
        new winston.transports.File({ filename: path.join(LOG_DIRECTORY, 'app.log'), format: fileFormat }),
        new winston.transports.File({ filename: path.join(LOG_DIRECTORY, 'error.log'), level: 'error', format: fileFormat }),
        new winston.transports.Console({ format: consoleFormat }),
    ],
});

module.exports = logger;
