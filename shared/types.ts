// User roles
export type UserRole = 'member' | 'admin' | 'platform_admin';

export const UserRoles = {
  MEMBER: 'member' as UserRole,
  ADMIN: 'admin' as UserRole,
  PLATFORM_ADMIN: 'platform_admin' as UserRole,
};

// Processing status
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export const ProcessingStatuses = {
  PENDING: 'pending' as ProcessingStatus,
  PROCESSING: 'processing' as ProcessingStatus,
  COMPLETED: 'completed' as ProcessingStatus,
  FAILED: 'failed' as ProcessingStatus,
  CANCELLED: 'cancelled' as ProcessingStatus,
};

// Source types
export type SourceType = 'file' | 'api';

export const SourceTypes = {
  FILE: 'file' as SourceType,
  API: 'api' as SourceType,
};

// Connection types
export type ConnectionType = 'teamwork_desk';

export const ConnectionTypes = {
  TEAMWORK_DESK: 'teamwork_desk' as ConnectionType,
};

// Field mapping target fields
export type TargetField =
  | 'message'
  | 'customer_name'
  | 'agent_name'
  | 'timestamp'
  | 'conversation_id'
  | 'status';

export const TargetFields = {
  MESSAGE: 'message' as TargetField,
  CUSTOMER_NAME: 'customer_name' as TargetField,
  AGENT_NAME: 'agent_name' as TargetField,
  TIMESTAMP: 'timestamp' as TargetField,
  CONVERSATION_ID: 'conversation_id' as TargetField,
  STATUS: 'status' as TargetField,
};

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  organizationId: number;
  organizationName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project types
export interface Project {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Source types
export interface Source {
  id: number;
  projectId: number;
  type: SourceType;
  name: string;
  // File source fields
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  rowCount: number | null;
  columns: string[] | null;
  // API source fields
  connectionId: number | null;
  apiFilters: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Connection types
export interface Connection {
  id: number;
  organizationId: number;
  name: string;
  type: ConnectionType;
  isValid: boolean;
  lastTestedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Field mapping types
export interface FieldMapping {
  id: number;
  sourceId: number;
  sourceColumn: string;
  targetField: TargetField | null;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

// Processing config types
export interface ProcessingConfig {
  id: number;
  projectId: number;
  // De-identification settings
  deidentifyNames: boolean;
  deidentifyEmails: boolean;
  deidentifyPhones: boolean;
  deidentifyCompanies: boolean;
  deidentifyAddresses: boolean;
  // Filter settings
  minMessageLength: number | null;
  excludeStatuses: string[] | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Processing run types
export interface ProcessingRun {
  id: number;
  projectId: number;
  triggeredById: number;
  status: ProcessingStatus;
  totalRecords: number;
  processedRecords: number;
  filteredRecords: number;
  errorCount: number;
  errorDetails: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Processed record types
export interface ProcessedRecord {
  id: number;
  runId: number;
  originalContent: string;
  processedContent: string;
  piiMappings: Record<string, string>;
  createdAt: Date;
}

// Invitation types
export interface Invitation {
  id: number;
  organizationId: number;
  email: string;
  role: UserRole;
  token: string;
  invitedById: number;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}
