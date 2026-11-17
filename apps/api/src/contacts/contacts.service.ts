import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { TenantDb } from '../db/tenant-db.service.js';
import { contacts } from '../db/schema.js';
import { CreateContactDto, UpdateContactDto } from './dto.js';

@Injectable()
export class ContactsService {
  constructor(private readonly tenantDb: TenantDb) {}

  list(orgId: string) {
    return this.tenantDb.run(orgId, async (tx) =>
      tx.select().from(contacts)
        .where(eq(contacts.orgId, orgId))
        .orderBy(desc(contacts.createdAt)));
  }

  create(orgId: string, dto: CreateContactDto) {
    return this.tenantDb.run(orgId, async (tx) => {
      const [row] = await tx.insert(contacts).values({ ...dto, orgId }).returning();
      return row;
    });
  }

  update(orgId: string, id: string, dto: UpdateContactDto) {
    return this.tenantDb.run(orgId, async (tx) => {
      const [row] = await tx.update(contacts)
        .set(dto)
        .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)))
        .returning();
      if (!row) throw new NotFoundException('Contact not found');
      return row;
    });
  }

  remove(orgId: string, id: string) {
    return this.tenantDb.run(orgId, async (tx) => {
      const [row] = await tx.delete(contacts)
        .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)))
        .returning({ id: contacts.id });
      if (!row) throw new NotFoundException('Contact not found');
      return { deleted: true, id: row.id };
    });
  }
}
