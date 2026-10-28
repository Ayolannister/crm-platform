    import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
    import pg from 'pg';
    import { PG_POOL } from '../db/db.module.js';

    @Controller('health')
    export class HealthController {
      constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

      @Get('live')
      live() {
        return { status: 'ok', uptime: process.uptime() };
      }

      @Get('ready')
      async ready() {
        try {
          await this.pool.query('SELECT 1');
          return { status: 'ok', checks: { database: 'up' } };
        } catch {
          throw new ServiceUnavailableException({
            status: 'error',
            checks: { database: 'down' },
          });
        }
      }
    }