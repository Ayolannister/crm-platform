   #!/bin/sh
   # Creates the least-privilege application role.
   # Runs once, when Postgres initializes an empty data directory.

   : "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"

   psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -c "CREATE ROLE crm_app LOGIN PASSWORD '${APP_DB_PASSWORD}';" \
     -c "GRANT CONNECT ON DATABASE \"${POSTGRES_DB}\" TO crm_app;" \
     -c "GRANT USAGE ON SCHEMA public TO crm_app;" \
     -c "ALTER DEFAULT PRIVILEGES FOR ROLE \"${POSTGRES_USER}\" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_app;" \
     -c "ALTER DEFAULT PRIVILEGES FOR ROLE \"${POSTGRES_USER}\" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO crm_app;"