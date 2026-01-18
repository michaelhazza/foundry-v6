import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  invitedById: integer('invited_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('invitations_organization_id_idx').on(table.organizationId),
  index('invitations_token_idx').on(table.token),
]);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
