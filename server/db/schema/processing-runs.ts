import { pgTable, serial, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const processingRuns = pgTable('processing_runs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  triggeredById: integer('triggered_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').notNull().default(0),
  filteredRecords: integer('filtered_records').notNull().default(0),
  errorRecords: integer('error_records').notNull().default(0),
  statistics: json('statistics').$type<ProcessingStatistics>(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('processing_runs_project_id_idx').on(table.projectId),
  index('processing_runs_triggered_by_id_idx').on(table.triggeredById),
  index('processing_runs_status_idx').on(table.status),
]);

export type ProcessingRun = typeof processingRuns.$inferSelect;
export type NewProcessingRun = typeof processingRuns.$inferInsert;

export interface ProcessingStatistics {
  piiCounts: {
    names: number;
    emails: number;
    phones: number;
    companies: number;
    addresses: number;
  };
  filterBreakdown: {
    minLength: number;
    status: number;
    dateRange: number;
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ProcessingStatusType = typeof ProcessingStatus[keyof typeof ProcessingStatus];
