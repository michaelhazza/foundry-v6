import { pgTable, serial, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const processingConfigs = pgTable('processing_configs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' })
    .unique(),
  // De-identification settings
  deIdentificationEnabled: boolean('de_identification_enabled').notNull().default(true),
  detectNames: boolean('detect_names').notNull().default(true),
  detectEmails: boolean('detect_emails').notNull().default(true),
  detectPhones: boolean('detect_phones').notNull().default(true),
  detectCompanies: boolean('detect_companies').notNull().default(true),
  detectAddresses: boolean('detect_addresses').notNull().default(true),
  // Filtering settings
  minMessageLength: integer('min_message_length'),
  minCharacterCount: integer('min_character_count'),
  resolvedStatusField: text('resolved_status_field'),
  resolvedStatusValue: text('resolved_status_value'),
  dateRangeStart: timestamp('date_range_start'),
  dateRangeEnd: timestamp('date_range_end'),
  // Role identification settings
  roleIdentifierField: text('role_identifier_field'),
  agentRoleValue: text('agent_role_value'),
  customerRoleValue: text('customer_role_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('processing_configs_project_id_idx').on(table.projectId),
]);

export type ProcessingConfig = typeof processingConfigs.$inferSelect;
export type NewProcessingConfig = typeof processingConfigs.$inferInsert;
