   import {
     pgTable, pgEnum, uuid, text, timestamp, primaryKey, index,
   } from 'drizzle-orm/pg-core';

   export const organizations = pgTable('organizations', {
     id: uuid('id').primaryKey().defaultRandom(),
     name: text('name').notNull(),
     slug: text('slug').notNull().unique(),
     createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
   });

   export const users = pgTable('users', {
     id: uuid('id').primaryKey().defaultRandom(),
     email: text('email').notNull().unique(),
     passwordHash: text('password_hash').notNull(),
     createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
   });

   export const memberRole = pgEnum('member_role', ['owner', 'admin', 'member']);

   export const memberships = pgTable(
     'memberships',
     {
       userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
       orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
       role: memberRole('role').notNull().default('member'),
       createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
     },
     (t) => [primaryKey({ columns: [t.userId, t.orgId] })],
   );

   export const contacts = pgTable(
     'contacts',
     {
       id: uuid('id').primaryKey().defaultRandom(),
       orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
       firstName: text('first_name').notNull(),
       lastName: text('last_name'),
       email: text('email'),
       phone: text('phone'),
       createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
     },
     (t) => [index('contacts_org_id_idx').on(t.orgId)],
   );