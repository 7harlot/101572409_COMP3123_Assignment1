const config = require('./config/env'); // loads .env first and fails fast on missing settings
const app = require('./app');
const { connectDatabase } = require('./config/db');
const logger = require('./utils/logger');

// Connect to MongoDB first, then accept requests: an API without its database is useless
async function startServer() {
    try {
        await connectDatabase();
        app.listen(config.port, () => {
            logger.info('Server started', { port: config.port, environment: config.nodeEnv });
        });
    } catch (error) {
        // Log only the message: a full connection error can include the URI
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

startServer();
