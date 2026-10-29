   # CRM API

   Multi-tenant CRM API built with NestJS, PostgreSQL and Drizzle ORM.

   ## Tenant isolation

   - Every tenant table carries an `org_id`.
   - PostgreSQL Row Level Security enforces isolation in the database.
   - The API connects as a least-privilege role (`crm_app`) that cannot bypass RLS or change schema.
   - The tenant is taken only from the signed JWT, never from the request body.

   ## Local development

   1. Start dependencies: `docker compose up -d postgres redis` (from the repo root)
   2. Copy env template: `cp .env.example .env`
   3. Generate a JWT secret: `printf '\nJWT_SECRET=%s\n' "$(openssl rand -base64 48)" >> .env`
   4. Apply migrations: `npm run db:migrate`
   5. Start the API: `npm run start:dev`

   ## Health checks

   - `GET /health/live`: process is running
   - `GET /health/ready`: database is reachable