const config = require('./config');
const logger = require('./logger');

let sdk = null;

function startOpenTelemetry() {
    if (!config.otel.endpoint) return null;
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

    sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({ url: config.otel.endpoint }),
        instrumentations: [getNodeAutoInstrumentations()],
        serviceName: config.otel.serviceName
    });
    sdk.start();
    logger.info({ endpoint: config.otel.endpoint }, 'OpenTelemetry started');
    return sdk;
}

async function shutdownOpenTelemetry() {
    if (!sdk) return;
    await sdk.shutdown();
}

module.exports = {
    startOpenTelemetry,
    shutdownOpenTelemetry
};
