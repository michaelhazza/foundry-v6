import { pgTable, serial, text, timestamp, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: text('role').notNull().default('member'), // 'admin' | 'member' | 'platform_admin'
  isActive: boolean('is_active').notNull().default(true),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_org_unique').on(table.email, table.organizationId),
  index('users_organization_id_idx').on(table.organizationId),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
