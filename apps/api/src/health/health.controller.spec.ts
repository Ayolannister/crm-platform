    import { describe, it, expect } from 'vitest';
    import type pg from 'pg';
    import { HealthController } from './health.controller.js';

    const fakePool = (healthy: boolean) =>
      ({
        query: async () => {
          if (!healthy) throw new Error('db down');
          return {};
        },
      }) as unknown as pg.Pool;

    describe('HealthController', () => {
      it('live is ok even when the database is down', () => {
        expect(new HealthController(fakePool(false)).live().status).toBe('ok');
      });

      it('ready is ok when the database responds', async () => {
        const res = await new HealthController(fakePool(true)).ready();
        expect(res.checks.database).toBe('up');
      });

      it('ready fails when the database is down', async () => {
        await expect(new HealthController(fakePool(false)).ready()).rejects.toThrow();
      });
    });
describe('HealthController readiness deadline', () => {
  it('reports not ready quickly when the database hangs', async () => {
    const hangingPool = { query: () => new Promise(() => {}) } as unknown as pg.Pool;
    const started = Date.now();
    await expect(new HealthController(hangingPool).ready()).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
