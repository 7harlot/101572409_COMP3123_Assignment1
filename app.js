const express = require('express');
const helmet = require('helmet');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');

// Builds the Express app without starting it, so tests can use it directly.
// Order matters: security headers -> logging -> body parsing -> routes -> 404 -> error handler.
const app = express();

app.use(helmet()); // security headers (see README "Security")
app.use(requestLogger);
app.use(express.json({ limit: '10kb' })); // small limit: no endpoint needs a big body

app.use('/health', healthRoutes);
// Milestone 2: app.use('/api/v1/user', userRoutes);
// Milestone 3: app.use('/api/v1/emp', employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
