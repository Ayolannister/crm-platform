CREATE TABLE "platform_admins" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Runtime identities should only be allowed to read the platform admin grants.
-- No application endpoint is permitted to create or remove these grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'infiniti_app') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.platform_admins FROM infiniti_app;
    GRANT SELECT ON TABLE public.platform_admins TO infiniti_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_app') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.platform_admins FROM crm_app;
    GRANT SELECT ON TABLE public.platform_admins TO crm_app;
  END IF;
END
$$;
