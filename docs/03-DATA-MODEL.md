# Foundry — Data Model Document

**Version:** 1.0  
**Date:** January 2026  
**Status:** COMPLETE  
**Source PRD:** 01-PRD.md v1.0  
**Source Architecture:** 02-ARCHITECTURE.md v1.0  
**Deployment Target:** Replit

---

## Section 1: Entity Overview

### Entities

| Entity | Purpose | Key Relationships |
|--------|---------|-------------------|
| organizations | Multi-tenant isolation container for all customer data | Has many users, projects, connections |
| users | Authenticated system users with role-based permissions | Belongs to organization, has many projects (created), has many processing_runs |
| invitations | Pending user invitations with token-based acceptance | Belongs to organization, invited by user |
| password_reset_tokens | Secure password reset tokens with expiration | Belongs to user |
| projects | Container for data processing workflows | Belongs to organization, has many sources, processing_configs, processing_runs |
| sources | Data sources (file uploads or API connections) | Belongs to project, optionally references connection |
| field_mappings | Column-to-field mapping configurations | Belongs to source |
| processing_configs | De-identification and filtering rule configurations | Belongs to project |
| processing_runs | Individual processing job executions with status tracking | Belongs to project, triggered by user |
| processed_records | Individual processed data records with de-identified content | Belongs to processing_run |
| connections | Encrypted API connection credentials (Teamwork Desk) | Belongs to organization, used by many sources |

### Entity Relationship Diagram

```
organizations 1────────────< users
      │                        │
      │                        │ (invited_by)
      │                        ▼
      │                   invitations
      │
      ├────────────────< projects
      │                     │
      │                     ├────< sources ────────< field_mappings
      │                     │         │
      │                     │         │ (optional)
      │                     │         ▼
      │                     │    connections ─────< organizations
      │                     │
      │                     ├────< processing_configs
      │                     │
      │                     └────< processing_runs ────< processed_records
      │                               │
      │                               │ (triggered_by)
      │                               ▼
      │                             users
      │
      └────────────────< connections

users 1────< password_reset_tokens
```

### Cardinality Summary

| Relationship | Type | Notes |
|--------------|------|-------|
| organizations → users | 1:N | User belongs to exactly one org |
| organizations → projects | 1:N | Projects scoped to single org |
| organizations → connections | 1:N | Connections scoped to single org |
| projects → sources | 1:N | Multiple sources per project |
| projects → processing_configs | 1:1 | Single config per project |
| projects → processing_runs | 1:N | Multiple runs (history) |
| sources → field_mappings | 1:N | One mapping per detected column |
| sources → connections | N:1 | API sources reference a connection |
| processing_runs → processed_records | 1:N | All records from a single run |
| users → invitations | 1:N | Admin can send many invitations |
| users → password_reset_tokens | 1:N | Multiple reset requests possible |

---

## Section 2: Schema Definition

```typescript
// server/db/schema.ts
import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean,
  json,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// ============================================================================
// Standard Audit Columns (applied to all tables)
// ============================================================================

const auditColumns = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};

// ============================================================================
// Organizations
// ============================================================================

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ...auditColumns,
});

// ============================================================================
// Users
// ============================================================================

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
  ...auditColumns,
}, (table) => [
  uniqueIndex('users_email_org_unique').on(table.email, table.organizationId),
  index('users_organization_id_idx').on(table.organizationId),
]);

// ============================================================================
// Invitations
// ============================================================================

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invitedById: integer('invited_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  ...auditColumns,
}, (table) => [
  index('invitations_organization_id_idx').on(table.organizationId),
  index('invitations_token_idx').on(table.token),
]);

// ============================================================================
// Password Reset Tokens
// ============================================================================

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ...auditColumns,
}, (table) => [
  index('password_reset_tokens_user_id_idx').on(table.userId),
  index('password_reset_tokens_token_idx').on(table.token),
]);

// ============================================================================
// Projects
// ============================================================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  // Soft delete pattern
  deletedAt: timestamp('deleted_at'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('projects_name_org_unique')
    .on(table.name, table.organizationId)
    .where('deleted_at IS NULL'),
  index('projects_organization_id_idx').on(table.organizationId),
]);

// ============================================================================
// Connections (API credentials for external services)
// ============================================================================

export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'teamwork_desk' (extensible for future integrations)
  // Encrypted credentials stored as JSON string
  encryptedCredentials: text('encrypted_credentials').notNull(),
  lastTestedAt: timestamp('last_tested_at'),
  lastSyncAt: timestamp('last_sync_at'),
  isValid: boolean('is_valid').notNull().default(true),
  ...auditColumns,
}, (table) => [
  index('connections_organization_id_idx').on(table.organizationId),
]);

// ============================================================================
// Sources (File uploads or API data sources)
// ============================================================================

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'file' | 'api'
  // File source fields
  fileName: text('file_name'),
  fileType: text('file_type'), // 'csv' | 'xlsx' | 'json'
  fileSize: integer('file_size'), // bytes
  filePath: text('file_path'), // temporary storage path
  selectedSheet: text('selected_sheet'), // for Excel files
  // API source fields
  connectionId: integer('connection_id')
    .references(() => connections.id, { onDelete: 'set null' }),
  apiConfig: json('api_config'), // { inbox, dateRange, status filters }
  // Common fields
  recordCount: integer('record_count'),
  detectedColumns: json('detected_columns'), // Array of column names/info
  status: text('status').notNull().default('pending'), // 'pending' | 'parsed' | 'error'
  errorMessage: text('error_message'),
  expiresAt: timestamp('expires_at'), // 30-day retention for files
  ...auditColumns,
}, (table) => [
  index('sources_project_id_idx').on(table.projectId),
  index('sources_connection_id_idx').on(table.connectionId),
]);

// ============================================================================
// Field Mappings (Column to target field mappings)
// ============================================================================

export const fieldMappings = pgTable('field_mappings', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  sourceColumn: text('source_column').notNull(),
  targetField: text('target_field'), // null = "do not import"
  // Target fields: 'message_content' | 'sender_name' | 'sender_email' | 
  //                'sender_role' | 'timestamp' | 'ticket_id' | 'status' | 
  //                'subject' | 'custom' | null
  confidence: text('confidence'), // 'high' | 'medium' | 'low' (for auto-suggestions)
  isAutoSuggested: boolean('is_auto_suggested').notNull().default(false),
  sampleValues: json('sample_values'), // First 5 sample values from column
  ...auditColumns,
}, (table) => [
  index('field_mappings_source_id_idx').on(table.sourceId),
  uniqueIndex('field_mappings_source_column_unique').on(table.sourceId, table.sourceColumn),
]);

// ============================================================================
// Processing Configs (De-identification and filtering rules)
// ============================================================================

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
  resolvedStatusField: text('resolved_status_field'), // Column name for status filter
  resolvedStatusValue: text('resolved_status_value'), // Value indicating "resolved"
  dateRangeStart: timestamp('date_range_start'),
  dateRangeEnd: timestamp('date_range_end'),
  // Role identification settings
  roleIdentifierField: text('role_identifier_field'),
  agentRoleValue: text('agent_role_value'),
  customerRoleValue: text('customer_role_value'),
  ...auditColumns,
}, (table) => [
  index('processing_configs_project_id_idx').on(table.projectId),
]);

// ============================================================================
// Processing Runs (Individual processing job executions)
// ============================================================================

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
  // Progress tracking
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').notNull().default(0),
  filteredRecords: integer('filtered_records').notNull().default(0),
  errorRecords: integer('error_records').notNull().default(0),
  // Statistics (populated on completion)
  statistics: json('statistics'),
  // { 
  //   piiCounts: { names: number, emails: number, phones: number, companies: number, addresses: number },
  //   filterBreakdown: { minLength: number, status: number, dateRange: number },
  //   errors: [{ row: number, message: string }]
  // }
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  ...auditColumns,
}, (table) => [
  index('processing_runs_project_id_idx').on(table.projectId),
  index('processing_runs_triggered_by_id_idx').on(table.triggeredById),
  index('processing_runs_status_idx').on(table.status),
]);

// ============================================================================
// Processed Records (Individual processed data records)
// ============================================================================

export const processedRecords = pgTable('processed_records', {
  id: serial('id').primaryKey(),
  processingRunId: integer('processing_run_id')
    .notNull()
    .references(() => processingRuns.id, { onDelete: 'cascade' }),
  sourceRowNumber: integer('source_row_number').notNull(),
  // Processed content in conversational format
  content: json('content').notNull(),
  // { 
  //   messages: [{ role: 'agent' | 'customer' | 'unknown', content: string }],
  //   metadata: { ticketId?: string, subject?: string, timestamp?: string }
  // }
  // De-identification mapping (for audit/debug purposes)
  piiMappings: json('pii_mappings'),
  // { 
  //   "John Smith": "[PERSON_1]",
  //   "john@email.com": "[EMAIL]",
  //   ...
  // }
  wasFiltered: boolean('was_filtered').notNull().default(false),
  filterReason: text('filter_reason'),
  hasError: boolean('has_error').notNull().default(false),
  errorMessage: text('error_message'),
  ...auditColumns,
}, (table) => [
  index('processed_records_processing_run_id_idx').on(table.processingRunId),
  index('processed_records_was_filtered_idx').on(table.wasFiltered),
]);
```

---

## Section 3: Relationships

### Foreign Key Definitions

| Table | Column | References | On Delete | Rationale |
|-------|--------|------------|-----------|-----------|
| users | organization_id | organizations.id | CASCADE | Delete users when org deleted |
| invitations | organization_id | organizations.id | CASCADE | Delete invitations when org deleted |
| invitations | invited_by_id | users.id | CASCADE | Delete invitations when inviter deleted |
| password_reset_tokens | user_id | users.id | CASCADE | Delete tokens when user deleted |
| projects | organization_id | organizations.id | CASCADE | Delete projects when org deleted |
| connections | organization_id | organizations.id | CASCADE | Delete connections when org deleted |
| sources | project_id | projects.id | CASCADE | Delete sources when project deleted |
| sources | connection_id | connections.id | SET NULL | Preserve source if connection deleted |
| field_mappings | source_id | sources.id | CASCADE | Delete mappings when source deleted |
| processing_configs | project_id | projects.id | CASCADE | Delete config when project deleted |
| processing_runs | project_id | projects.id | CASCADE | Delete runs when project deleted |
| processing_runs | triggered_by_id | users.id | CASCADE | Delete runs when user deleted |
| processed_records | processing_run_id | processing_runs.id | CASCADE | Delete records when run deleted |

### Junction Tables

None required. All relationships are 1:N or N:1 without many-to-many patterns.

### Soft Delete Pattern

Projects use soft delete (`deleted_at` timestamp):

```typescript
// Soft delete a project
await db.update(projects)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(eq(projects.id, projectId));

// Query active projects only
const activeProjects = await db
  .select()
  .from(projects)
  .where(and(
    eq(projects.organizationId, orgId),
    isNull(projects.deletedAt)
  ));
```

---

## Section 4: Index Strategy

### Index Definitions

| Table | Index Name | Columns | Type | Rationale |
|-------|------------|---------|------|-----------|
| users | users_email_org_unique | email, organization_id | Unique | Enforce unique email per org |
| users | users_organization_id_idx | organization_id | B-tree | FK queries, list users by org |
| invitations | invitations_organization_id_idx | organization_id | B-tree | FK queries |
| invitations | invitations_token_idx | token | B-tree | Token lookup on accept |
| password_reset_tokens | password_reset_tokens_user_id_idx | user_id | B-tree | FK queries |
| password_reset_tokens | password_reset_tokens_token_idx | token | B-tree | Token lookup on reset |
| projects | projects_name_org_unique | name, organization_id | Unique (partial) | Unique names per org (active only) |
| projects | projects_organization_id_idx | organization_id | B-tree | FK queries, list projects |
| connections | connections_organization_id_idx | organization_id | B-tree | FK queries, list connections |
| sources | sources_project_id_idx | project_id | B-tree | FK queries, list sources |
| sources | sources_connection_id_idx | connection_id | B-tree | FK queries |
| field_mappings | field_mappings_source_id_idx | source_id | B-tree | FK queries, list mappings |
| field_mappings | field_mappings_source_column_unique | source_id, source_column | Unique | One mapping per column |
| processing_configs | processing_configs_project_id_idx | project_id | B-tree | FK queries (1:1) |
| processing_runs | processing_runs_project_id_idx | project_id | B-tree | FK queries, list runs |
| processing_runs | processing_runs_triggered_by_id_idx | triggered_by_id | B-tree | FK queries |
| processing_runs | processing_runs_status_idx | status | B-tree | Filter by status (platform admin) |
| processed_records | processed_records_processing_run_id_idx | processing_run_id | B-tree | FK queries, batch retrieval |
| processed_records | processed_records_was_filtered_idx | was_filtered | B-tree | Filter statistics |

---

## Section 5: Query Patterns

### Common Query Examples (Core Select API)

```typescript
import { db } from './db';
import { 
  organizations, users, projects, sources, fieldMappings,
  processingConfigs, processingRuns, processedRecords, connections,
  invitations, passwordResetTokens
} from './db/schema';
import { eq, and, isNull, desc, sql, count } from 'drizzle-orm';

// ============================================================================
// Authentication Queries
// ============================================================================

// Find user by email (for login)
export async function findUserByEmail(email: string, orgId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, email),
      eq(users.organizationId, orgId),
      eq(users.isActive, true)
    ))
    .limit(1);
  return user;
}

// Find user by email across all orgs (platform admin or forgot password)
export async function findUserByEmailGlobal(email: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      organizationId: users.organizationId,
      role: users.role,
      isActive: users.isActive,
      organizationName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email))
    .limit(1);
  return user;
}

// ============================================================================
// Organization Queries
// ============================================================================

// List all organizations (platform admin)
export async function listOrganizations() {
  return await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
      userCount: sql<number>`count(distinct ${users.id})`.as('user_count'),
      projectCount: sql<number>`count(distinct ${projects.id})`.as('project_count'),
    })
    .from(organizations)
    .leftJoin(users, eq(users.organizationId, organizations.id))
    .leftJoin(projects, and(
      eq(projects.organizationId, organizations.id),
      isNull(projects.deletedAt)
    ))
    .groupBy(organizations.id, organizations.name, organizations.createdAt)
    .orderBy(desc(organizations.createdAt));
}

// ============================================================================
// User Queries
// ============================================================================

// List users in organization (with pagination)
export async function listOrgUsers(orgId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  
  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, orgId));
  
  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.organizationId, orgId))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
  
  return {
    data: userList,
    pagination: {
      page,
      limit,
      total: totalResult.count,
      totalPages: Math.ceil(totalResult.count / limit),
    },
  };
}

// ============================================================================
// Project Queries
// ============================================================================

// List projects for organization (with latest run status)
export async function listOrgProjects(orgId: number) {
  const projectList = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(
      eq(projects.organizationId, orgId),
      isNull(projects.deletedAt)
    ))
    .orderBy(desc(projects.updatedAt));
  
  // Get latest run for each project (avoiding N+1)
  const projectIds = projectList.map(p => p.id);
  if (projectIds.length === 0) return projectList.map(p => ({ ...p, latestRun: null }));
  
  const latestRuns = await db
    .select({
      projectId: processingRuns.projectId,
      status: processingRuns.status,
      completedAt: processingRuns.completedAt,
    })
    .from(processingRuns)
    .where(sql`${processingRuns.projectId} IN ${projectIds}`)
    .orderBy(desc(processingRuns.createdAt));
  
  // Map latest run per project
  const runMap = new Map<number, typeof latestRuns[0]>();
  for (const run of latestRuns) {
    if (!runMap.has(run.projectId)) {
      runMap.set(run.projectId, run);
    }
  }
  
  return projectList.map(p => ({
    ...p,
    latestRun: runMap.get(p.id) || null,
  }));
}

// Get project with sources and config
export async function getProjectWithDetails(projectId: number, orgId: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, orgId),
      isNull(projects.deletedAt)
    ))
    .limit(1);
  
  if (!project) return null;
  
  const projectSources = await db
    .select()
    .from(sources)
    .where(eq(sources.projectId, projectId));
  
  const [config] = await db
    .select()
    .from(processingConfigs)
    .where(eq(processingConfigs.projectId, projectId))
    .limit(1);
  
  return { ...project, sources: projectSources, config };
}

// ============================================================================
// Source and Field Mapping Queries
// ============================================================================

// Get source with field mappings
export async function getSourceWithMappings(sourceId: number) {
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);
  
  if (!source) return null;
  
  const mappings = await db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.sourceId, sourceId));
  
  return { ...source, mappings };
}

// ============================================================================
// Processing Queries
// ============================================================================

// Get processing run with statistics
export async function getProcessingRunWithStats(runId: number) {
  const [run] = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.id, runId))
    .limit(1);
  
  return run;
}

// Get processed records for export (with pagination for large datasets)
export async function getProcessedRecordsForExport(
  runId: number, 
  page: number, 
  limit: number
) {
  const offset = (page - 1) * limit;
  
  return await db
    .select({
      content: processedRecords.content,
    })
    .from(processedRecords)
    .where(and(
      eq(processedRecords.processingRunId, runId),
      eq(processedRecords.wasFiltered, false),
      eq(processedRecords.hasError, false)
    ))
    .orderBy(processedRecords.sourceRowNumber)
    .limit(limit)
    .offset(offset);
}

// Platform admin: List all active processing runs
export async function listActiveProcessingRuns() {
  return await db
    .select({
      id: processingRuns.id,
      projectId: processingRuns.projectId,
      projectName: projects.name,
      organizationName: organizations.name,
      status: processingRuns.status,
      totalRecords: processingRuns.totalRecords,
      processedRecords: processingRuns.processedRecords,
      startedAt: processingRuns.startedAt,
    })
    .from(processingRuns)
    .innerJoin(projects, eq(processingRuns.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(sql`${processingRuns.status} IN ('pending', 'processing')`)
    .orderBy(desc(processingRuns.createdAt));
}

// ============================================================================
// Connection Queries
// ============================================================================

// List connections for organization
export async function listOrgConnections(orgId: number) {
  return await db
    .select({
      id: connections.id,
      name: connections.name,
      type: connections.type,
      lastTestedAt: connections.lastTestedAt,
      lastSyncAt: connections.lastSyncAt,
      isValid: connections.isValid,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(eq(connections.organizationId, orgId))
    .orderBy(desc(connections.createdAt));
}
```

### Transaction Examples

```typescript
import { db } from './db';
import { organizations, users, processingConfigs, projects } from './db/schema';

// Create organization with initial admin user (transaction)
export async function createOrganizationWithAdmin(
  orgName: string,
  adminEmail: string,
  adminPasswordHash: string
) {
  return await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: orgName })
      .returning();
    
    const [admin] = await tx
      .insert(users)
      .values({
        organizationId: org.id,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'admin',
      })
      .returning();
    
    return { organization: org, admin };
  });
}

// Create project with default processing config (transaction)
export async function createProjectWithConfig(
  orgId: number,
  name: string,
  description: string | null
) {
  return await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        organizationId: orgId,
        name,
        description,
      })
      .returning();
    
    const [config] = await tx
      .insert(processingConfigs)
      .values({
        projectId: project.id,
        // Defaults applied from schema
      })
      .returning();
    
    return { project, config };
  });
}
```

---

## Section 6: Migration Strategy

### Initial Migration Approach

Use Drizzle Kit `db:push` for initial development, then generate migrations for production:

```bash
# Development: Direct schema push (fast iteration)
npm run db:push

# Production: Generate and run migrations
npm run db:generate
npm run db:migrate
```

### drizzle.config.ts

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Migration Scripts

```json
// package.json (partial)
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "tsx server/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

```typescript
// server/db/migrate.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import 'dotenv/config';

async function runMigrations() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);
  
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete');
  
  await sql.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### Database Connection Module

```typescript
// server/db/index.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Connection configuration optimized for Replit
const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,                    // Connection pool size
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Connection timeout
});

export const db = drizzle(sql, { schema });

// Graceful shutdown handler
export async function closeDatabase() {
  await sql.end();
}
```

### Seed Data Requirements

For development and testing, seed script should create:

1. **Platform Admin Organization**
   - Organization: "Foundry Platform"
   - User: platform admin account

2. **Test Organization**
   - Organization: "Demo Company"
   - Users: 1 admin, 2 members
   - Project: "Sample Support Data" with file source
   - Connection: Mock Teamwork Desk connection

```typescript
// server/db/seed.ts
import { db } from './index';
import { organizations, users, projects, processingConfigs } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');
  
  // Create platform org
  const [platformOrg] = await db
    .insert(organizations)
    .values({ name: 'Foundry Platform' })
    .returning();
  
  // Create platform admin
  const passwordHash = await bcrypt.hash('admin123', 12);
  await db.insert(users).values({
    organizationId: platformOrg.id,
    email: 'admin@foundry.io',
    passwordHash,
    name: 'Platform Admin',
    role: 'platform_admin',
  });
  
  // Create demo org
  const [demoOrg] = await db
    .insert(organizations)
    .values({ name: 'Demo Company' })
    .returning();
  
  // Create demo users
  await db.insert(users).values([
    {
      organizationId: demoOrg.id,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Demo Admin',
      role: 'admin',
    },
    {
      organizationId: demoOrg.id,
      email: 'user@demo.com',
      passwordHash,
      name: 'Demo User',
      role: 'member',
    },
  ]);
  
  // Create sample project
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: demoOrg.id,
      name: 'Sample Support Data',
      description: 'Demo project for testing',
    })
    .returning();
  
  // Create default config
  await db.insert(processingConfigs).values({
    projectId: project.id,
  });
  
  console.log('Seed complete');
}

seed().catch(console.error);
```

### Rollback Procedures

For Drizzle migrations, rollback is handled by:

1. Generate a new migration that reverses changes
2. Drop and recreate for development environments

```bash
# Development reset
npm run db:push --force

# Production: Create reversal migration
# (manual process - create migration file that undoes changes)
```

---

## Section 7: Type Exports

```typescript
// server/db/schema.ts (continued)

// ============================================================================
// Type Exports
// ============================================================================

// Organizations
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// Users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Invitations
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

// Password Reset Tokens
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Projects
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// Connections
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

// Sources
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

// Field Mappings
export type FieldMapping = typeof fieldMappings.$inferSelect;
export type NewFieldMapping = typeof fieldMappings.$inferInsert;

// Processing Configs
export type ProcessingConfig = typeof processingConfigs.$inferSelect;
export type NewProcessingConfig = typeof processingConfigs.$inferInsert;

// Processing Runs
export type ProcessingRun = typeof processingRuns.$inferSelect;
export type NewProcessingRun = typeof processingRuns.$inferInsert;

// Processed Records
export type ProcessedRecord = typeof processedRecords.$inferSelect;
export type NewProcessedRecord = typeof processedRecords.$inferInsert;

// ============================================================================
// Custom Types for JSON columns
// ============================================================================

export interface SourceApiConfig {
  inbox?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  statusFilter?: string;
}

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

export interface PiiMappings {
  [originalValue: string]: string; // e.g., "John Smith": "[PERSON_1]"
}

// ============================================================================
// Role Constants
// ============================================================================

export const UserRoles = {
  PLATFORM_ADMIN: 'platform_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

export const SourceTypes = {
  FILE: 'file',
  API: 'api',
} as const;

export type SourceType = typeof SourceTypes[keyof typeof SourceTypes];

export const FileTypes = {
  CSV: 'csv',
  XLSX: 'xlsx',
  JSON: 'json',
} as const;

export type FileType = typeof FileTypes[keyof typeof FileTypes];

export const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ProcessingStatusType = typeof ProcessingStatus[keyof typeof ProcessingStatus];

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
```

---

## Section 8: Document Validation

### Completeness Checklist

- [x] All PRD entities represented
- [x] All relationships defined with cascade behaviour
- [x] Foreign keys indexed
- [x] Audit columns on all tables
- [x] Migration scripts specified
- [x] Type exports defined

### Entity Coverage

| PRD Entity | Schema Table | Status |
|------------|--------------|--------|
| Organization | organizations | ✅ Complete |
| User | users | ✅ Complete |
| Invitation | invitations | ✅ Complete |
| PasswordResetToken | password_reset_tokens | ✅ Complete |
| Project | projects | ✅ Complete |
| Source (FileSource, APISource) | sources | ✅ Complete (unified with type discriminator) |
| FieldMapping | field_mappings | ✅ Complete |
| ProcessingConfiguration | processing_configs | ✅ Complete |
| ProcessingRun | processing_runs | ✅ Complete |
| ProcessedOutput | processed_records | ✅ Complete |
| Connection (APIConnection) | connections | ✅ Complete |

### Assumptions Made

1. **A1:** Single source type table with `type` discriminator (file vs API) rather than separate tables - simplifies querying and relationships
2. **A2:** Processing config is 1:1 with project rather than versioned - aligns with PRD "re-process replaces previous output"
3. **A3:** Processed records stored individually rather than as single JSONL blob - enables statistics and per-record filtering
4. **A4:** PII mappings stored per-record for audit trail - may be omitted in production for space
5. **A5:** Users belong to exactly one organization (no multi-org membership per PRD)

### Document Status: COMPLETE

---

## Section 9: Downstream Agent Handoff Brief

### For Agent 4: API Contract

**Entity Operations Needed:**

| Entity | Operations | Notes |
|--------|------------|-------|
| organizations | Read, Create (platform admin) | List for platform admin |
| users | List, Create (via invite), Update, Deactivate | Scoped to org |
| invitations | Create, Read, Accept | Token-based acceptance |
| projects | CRUD | Soft delete with deletedAt |
| sources | Create, Read, Delete | File upload or API selection |
| field_mappings | Read, Update | Auto-created on source parse |
| processing_configs | Read, Update | 1:1 with project |
| processing_runs | Create (trigger), Read, Cancel | Status polling |
| processed_records | Read (export) | Bulk retrieval for download |
| connections | CRUD, Test | Encrypted credentials |

**Relationship Traversal Patterns:**
- Project → Sources → FieldMappings (nested)
- Project → ProcessingConfig (included)
- ProcessingRun → ProcessedRecords (paginated)
- Organization → Users (paginated)

**Pagination Requirements:**
- Users list: page/limit with total
- Projects list: no pagination (typical org has <50 projects)
- Processed records export: cursor-based for large datasets

### For Agent 5: UI/UX Specification

**Data Shapes for Forms:**

```typescript
// Create Project
{ name: string, description?: string }

// Update Field Mapping
{ mappings: [{ id: number, targetField: string | null }] }

// Update Processing Config
{ 
  deIdentificationEnabled: boolean,
  detectNames: boolean,
  // ... other toggles
  minMessageLength?: number,
  resolvedStatusValue?: string,
  // ... other filters
}

// Create Connection
{ name: string, type: 'teamwork_desk', credentials: { apiKey: string, subdomain: string } }
```

**List/Detail Patterns:**
- Dashboard: Project cards with name, status badge, last updated
- User list: Table with email, name, role, status, last active
- Source list: Cards with type icon, file name or connection name, record count
- Processing history: Table with run date, status, record counts

**Relationship Displays:**
- Project detail shows sources inline
- Source detail shows field mappings table
- Processing run shows statistics breakdown

### For Agent 6: Implementation Orchestrator

**File Locations:**
- Schema: `server/db/schema.ts`
- Connection: `server/db/index.ts`
- Migrations: `./drizzle/`

**Migration Commands:**
```bash
npm run db:push      # Development (direct push)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations (production)
```

**Type Imports:**
```typescript
import { db, closeDatabase } from '@/server/db';
import { 
  users, projects, sources, fieldMappings,
  processingConfigs, processingRuns, processedRecords,
  connections, invitations, passwordResetTokens,
  type User, type Project, type Source,
  UserRoles, ProcessingStatus, TargetFields
} from '@/server/db/schema';
```

**Critical Implementation Notes:**
- Use `postgres` package (postgres-js), NOT @neondatabase/serverless
- Use Core Select API only: `db.select().from()`
- Query API forbidden: `db.query.` will cause issues
- All tenant-scoped queries must include `organizationId` filter
- Graceful shutdown: Call `closeDatabase()` on SIGTERM

### For Agent 7: QA & Deployment

**Seed Data for Testing:**
- Platform admin: admin@foundry.io / admin123
- Demo org admin: admin@demo.com / admin123
- Demo org member: user@demo.com / admin123

**Migration Verification Steps:**
1. Run `npm run db:push` or `npm run db:migrate`
2. Verify all tables created: organizations, users, invitations, password_reset_tokens, projects, connections, sources, field_mappings, processing_configs, processing_runs, processed_records
3. Verify indexes created (check with `\d tablename` in psql)
4. Run seed script for test data
5. Test basic CRUD operations

**Data Integrity Checks:**
- Unique constraints: users.email+org_id, projects.name+org_id (active only)
- Foreign key cascade: Delete org → cascades to all child data
- Soft delete: Projects query with `deletedAt IS NULL`

---

## Document End
