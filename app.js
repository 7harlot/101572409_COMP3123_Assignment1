const express = require('express');
const helmet = require('helmet');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const healthRoutes = require('./routes/healthRoutes');
const userRoutes = require('./routes/userRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

// Builds the Express app without starting it, so tests can use it directly.
// Order matters: security headers -> logging -> body parsing -> routes -> 404 -> error handler.
const app = express();

app.use(helmet()); // security headers (see README "Security")
// Behind a proxy (Render, Heroku...) set TRUST_PROXY=1 so rate limiting sees the real client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(requestLogger);
app.use(express.json({ limit: '10kb' })); // small limit: no endpoint needs a big body

app.use('/health', healthRoutes);
app.use('/api', apiLimiter); // general limit for all API traffic (login/signup also have a stricter one)
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/emp', employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
