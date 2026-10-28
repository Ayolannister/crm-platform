    import pg from 'pg';
    import { drizzle } from 'drizzle-orm/node-postgres';
    import { migrate } from 'drizzle-orm/node-postgres/migrator';

    async function main() {
    //   const url = process.env.DATABASE_URL;
    //   if (!url) throw new Error('DATABASE_URL is not set');
    const url = process.env.MIGRATION_DATABASE_URL;
    if (!url) throw new Error('MIGRATION_DATABASE_URL is not set');
      const pool = new pg.Pool({ connectionString: url, max: 1 });
      try {
        await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
        console.log('Migrations applied');
      } finally {
        await pool.end();
      }
    }

    main().catch((err) => {
      console.error('Migration failed', err);
      process.exit(1);
    });