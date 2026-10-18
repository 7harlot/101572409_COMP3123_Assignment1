const { getDatabaseState } = require('../config/db');
const packageInfo = require('../package.json');

// GET /health
// 200 when the server and database are both up, 503 when the server runs but MongoDB is unreachable,
// so a monitor (or the marker) can tell "API down" from "database down" at a glance.
function getHealth(req, res) {
    const databaseState = getDatabaseState();
    const isHealthy = databaseState === 'connected';

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        service: packageInfo.name,
        version: packageInfo.version,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        database: databaseState,
    });
}

module.exports = { getHealth };
