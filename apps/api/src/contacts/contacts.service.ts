    import { Injectable } from '@nestjs/common';
    import { desc, eq } from 'drizzle-orm';
    import { TenantDb } from '../db/tenant-db.service.js';
    import { contacts } from '../db/schema.js';
    import { CreateContactDto } from './dto.js';

    @Injectable()
    export class ContactsService {
      constructor(private readonly tenantDb: TenantDb) {}

      list(orgId: string) {
        return this.tenantDb.run(orgId, async (tx) =>
          tx
            .select()
            .from(contacts)
            .where(eq(contacts.orgId, orgId))
            .orderBy(desc(contacts.createdAt)),
        );
      }

      create(orgId: string, dto: CreateContactDto) {
        return this.tenantDb.run(orgId, async (tx) => {
          const [row] = await tx.insert(contacts).values({ ...dto, orgId }).returning();
          return row;
        });
      }
    }