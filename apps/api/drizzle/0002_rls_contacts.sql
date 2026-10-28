   ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
   --> statement-breakpoint
   ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;
   --> statement-breakpoint
   CREATE POLICY tenant_isolation ON "contacts"
     USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
     WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);