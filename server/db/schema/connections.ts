import { pgTable, serial, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'teamwork_desk'
  encryptedCredentials: text('encrypted_credentials').notNull(),
  lastTestedAt: timestamp('last_tested_at'),
  lastSyncAt: timestamp('last_sync_at'),
  isValid: boolean('is_valid').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('connections_organization_id_idx').on(table.organizationId),
]);

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
