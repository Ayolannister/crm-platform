    import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
    import pg from 'pg';
    import { drizzle } from 'drizzle-orm/node-postgres';
    import * as schema from './schema.js';

    export const PG_POOL = Symbol('PG_POOL');
    export const DB = Symbol('DB');

    @Global()
    @Module({
      providers: [
        {
          provide: PG_POOL,
          useFactory: () =>
            new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 }),
        },
        {
          provide: DB,
          inject: [PG_POOL],
          useFactory: (pool: pg.Pool) => drizzle(pool, { schema }),
        },
      ],
      exports: [PG_POOL, DB],
    })
    export class DbModule implements OnApplicationShutdown {
      constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

      async onApplicationShutdown() {
        await this.pool.end();
      }
    }