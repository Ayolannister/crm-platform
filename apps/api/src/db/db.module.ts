import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { DB, PG_POOL } from './db.tokens.js';
import { TenantDb } from './tenant-db.service.js';

export { DB, PG_POOL };

const logger = new Logger('PgPool');

// When the database restarts or fails over, it closes idle pooled connections and
// the pool emits 'error'. Without a listener, Node.js treats that as fatal and the
// whole API crashes. With one, the pool simply opens fresh connections later.
export function createPool(connectionString: string | undefined): pg.Pool {
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on('error', (err) => {
    logger.warn(`Idle database connection lost: ${err.message}`);
  });
  return pool;
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => createPool(process.env.DATABASE_URL),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool) => drizzle(pool, { schema }),
    },
    TenantDb,
  ],
  exports: [PG_POOL, DB, TenantDb],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
