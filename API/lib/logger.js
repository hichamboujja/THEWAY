const pino = require('pino');
const config = require('./config');

const logger = pino({
    level: config.logLevel,
    base: {
        service: 'theway-api',
        environment: config.nodeEnv
    },
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            '*.password',
            'token',
            '*.token',
            'apiKey',
            '*.apiKey',
            'refresh_token',
            'access_token'
        ],
        censor: '[redacted]'
    }
});

module.exports = logger;
