    import { Inject, Injectable } from '@nestjs/common';
    import { sql } from 'drizzle-orm';
    import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
    import { DB } from './db.tokens.js';
    import * as schema from './schema.js';

    export type Database = NodePgDatabase<typeof schema>;
    export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

    @Injectable()
    export class TenantDb {
      constructor(@Inject(DB) private readonly db: Database) {}

      run<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
        return this.db.transaction(async (tx) => {
          await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
          return fn(tx);
        });
      }
    }