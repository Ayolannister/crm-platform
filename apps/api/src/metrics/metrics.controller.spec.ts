import { describe, it, expect } from 'vitest';
import { MetricsController } from './metrics.controller.js';
import { httpRequestDuration } from './metrics.js';

describe('MetricsController', () => {
  it('exports the request histogram in Prometheus format', async () => {
    httpRequestDuration.observe({ method: 'GET', route: '/health/live', status: '200' }, 0.01);
    const body = await new MetricsController().metrics();
    expect(body).toContain('http_request_duration_seconds_bucket');
    expect(body).toContain('route="/health/live"');
  });
});