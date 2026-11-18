CREATE TABLE "platform_admins" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- No public HTTP endpoint grants this role. Bootstrap through a reviewed DB operation.
