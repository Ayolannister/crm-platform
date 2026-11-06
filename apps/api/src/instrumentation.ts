import { register } from 'node:module';

// Tracing is opt-in: only when a collector endpoint is configured.
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // ESM modules can only be patched through a loader hook, registered before they load.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'crm-api',
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          // Probes and scrapes would drown real traffic.
          ignoreIncomingRequestHook: (req: { url?: string }) =>
            Boolean(req.url?.startsWith('/health') || req.url === '/metrics'),
        },
      }),
    ],
  });

  sdk.start();
  process.once('SIGTERM', () => {
    void sdk.shutdown();
  });
}
