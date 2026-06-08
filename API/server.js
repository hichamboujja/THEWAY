const config = require('./lib/config');
const logger = require('./lib/logger');
const { createApp } = require('./app');
const db = require('./lib/db');
const { startOpenTelemetry, shutdownOpenTelemetry } = require('./lib/otel');

startOpenTelemetry();

const app = createApp();
const server = app.listen(config.port, () => {
    logger.info({
        port: config.port,
        database: config.db.database,
        environment: config.nodeEnv,
        corsOrigins: config.corsOrigins
    }, 'TheWay API server started');
});

async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down TheWay API server');
    server.close(async () => {
        await db.close();
        await shutdownOpenTelemetry();
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
