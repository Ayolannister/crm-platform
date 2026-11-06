import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import pg from 'pg';
import { PG_POOL } from '../db/db.module.js';

// The kubelet gives up on a probe after 1 second, so the check must answer first.
const READY_TIMEOUT_MS = 800;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms).unref();
    }),
  ]);
}

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime(), version: process.env.GIT_SHA ?? 'unknown' };
  }

  @Get('ready')
  async ready() {
    try {
      await withTimeout(this.pool.query('SELECT 1'), READY_TIMEOUT_MS);
      return { status: 'ok', checks: { database: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down' },
      });
    }
  }
}
