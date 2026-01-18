import { pgTable, serial, text, timestamp, integer, boolean, json, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sources } from './sources';

export const fieldMappings = pgTable('field_mappings', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  sourceColumn: text('source_column').notNull(),
  targetField: text('target_field'), // null = "do not import"
  confidence: text('confidence'), // 'high' | 'medium' | 'low'
  isAutoSuggested: boolean('is_auto_suggested').notNull().default(false),
  sampleValues: json('sample_values').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('field_mappings_source_id_idx').on(table.sourceId),
  uniqueIndex('field_mappings_source_column_unique').on(table.sourceId, table.sourceColumn),
]);

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type NewFieldMapping = typeof fieldMappings.$inferInsert;

export const TargetFields = {
  MESSAGE_CONTENT: 'message_content',
  SENDER_NAME: 'sender_name',
  SENDER_EMAIL: 'sender_email',
  SENDER_ROLE: 'sender_role',
  TIMESTAMP: 'timestamp',
  TICKET_ID: 'ticket_id',
  STATUS: 'status',
  SUBJECT: 'subject',
  CUSTOM: 'custom',
} as const;

export type TargetField = typeof TargetFields[keyof typeof TargetFields] | null;
