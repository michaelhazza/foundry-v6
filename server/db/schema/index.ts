// Organizations
export { organizations } from './organizations';
export type { Organization, NewOrganization } from './organizations';

// Users
export { users } from './users';
export type { User, NewUser } from './users';

// Invitations
export { invitations } from './invitations';
export type { Invitation, NewInvitation } from './invitations';

// Password Reset Tokens
export { passwordResetTokens } from './password-reset-tokens';
export type { PasswordResetToken, NewPasswordResetToken } from './password-reset-tokens';

// Projects
export { projects } from './projects';
export type { Project, NewProject } from './projects';

// Connections
export { connections } from './connections';
export type { Connection, NewConnection } from './connections';

// Sources
export { sources } from './sources';
export type { Source, NewSource, SourceApiConfig } from './sources';

// Field Mappings
export { fieldMappings, TargetFields } from './field-mappings';
export type { FieldMapping, NewFieldMapping, TargetField } from './field-mappings';

// Processing Configs
export { processingConfigs } from './processing-configs';
export type { ProcessingConfig, NewProcessingConfig } from './processing-configs';

// Processing Runs
export { processingRuns, ProcessingStatus } from './processing-runs';
export type { ProcessingRun, NewProcessingRun, ProcessingStatistics, ProcessingStatusType } from './processing-runs';

// Processed Records
export { processedRecords } from './processed-records';
export type { ProcessedRecord, NewProcessedRecord, ProcessedContent, PiiMappings } from './processed-records';

// User Roles
export const UserRoles = {
  PLATFORM_ADMIN: 'platform_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

// Source Types
export const SourceTypes = {
  FILE: 'file',
  API: 'api',
} as const;

export type SourceType = typeof SourceTypes[keyof typeof SourceTypes];

// File Types
export const FileTypes = {
  CSV: 'csv',
  XLSX: 'xlsx',
  JSON: 'json',
} as const;

export type FileType = typeof FileTypes[keyof typeof FileTypes];
