import { pgTable, serial, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { connections } from './connections';

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'file' | 'api'
  name: text('name').notNull(),
  // File source fields
  fileName: text('file_name'),
  fileType: text('file_type'), // 'csv' | 'xlsx' | 'json'
  fileSize: integer('file_size'),
  filePath: text('file_path'),
  selectedSheet: text('selected_sheet'),
  // API source fields
  connectionId: integer('connection_id')
    .references(() => connections.id, { onDelete: 'set null' }),
  apiConfig: json('api_config'),
  // Common fields
  recordCount: integer('record_count'),
  detectedColumns: json('detected_columns').$type<string[]>(),
  status: text('status').notNull().default('pending'), // 'pending' | 'parsed' | 'error'
  errorMessage: text('error_message'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sources_project_id_idx').on(table.projectId),
  index('sources_connection_id_idx').on(table.connectionId),
]);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export interface SourceApiConfig {
  inbox?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  statusFilter?: string;
}
