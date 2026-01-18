import { pgTable, serial, text, timestamp, integer, boolean, json, index } from 'drizzle-orm/pg-core';
import { processingRuns } from './processing-runs';

export const processedRecords = pgTable('processed_records', {
  id: serial('id').primaryKey(),
  processingRunId: integer('processing_run_id')
    .notNull()
    .references(() => processingRuns.id, { onDelete: 'cascade' }),
  sourceRowNumber: integer('source_row_number').notNull(),
  content: json('content').notNull().$type<ProcessedContent>(),
  piiMappings: json('pii_mappings').$type<PiiMappings>(),
  wasFiltered: boolean('was_filtered').notNull().default(false),
  filterReason: text('filter_reason'),
  hasError: boolean('has_error').notNull().default(false),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('processed_records_processing_run_id_idx').on(table.processingRunId),
  index('processed_records_was_filtered_idx').on(table.wasFiltered),
]);

export type ProcessedRecord = typeof processedRecords.$inferSelect;
export type NewProcessedRecord = typeof processedRecords.$inferInsert;

export interface ProcessedContent {
  messages: Array<{
    role: 'agent' | 'customer' | 'unknown';
    content: string;
  }>;
  metadata?: {
    ticketId?: string;
    subject?: string;
    timestamp?: string;
  };
}

export interface PiiMappings {
  [originalValue: string]: string;
}
