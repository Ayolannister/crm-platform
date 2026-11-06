import client from 'prom-client';

// One registry for the whole process: default Node.js metrics plus our own.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// Rate, errors and duration from a single histogram.
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});