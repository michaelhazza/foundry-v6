import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// User schemas
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).default('member'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

export const acceptInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

// Source schemas
export const createApiSourceSchema = z.object({
  connectionId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    status: z.array(z.string()).optional(),
  }).optional(),
});

export const selectSheetSchema = z.object({
  sheetName: z.string().min(1),
});

export const updateFieldMappingsSchema = z.object({
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.enum([
      'message',
      'customer_name',
      'agent_name',
      'timestamp',
      'conversation_id',
      'status',
    ]).nullable(),
  })),
});

// Connection schemas
export const createConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['teamwork_desk']),
  credentials: z.object({
    apiKey: z.string().min(1),
    subdomain: z.string().min(1),
  }),
});

export const updateConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  credentials: z.object({
    apiKey: z.string().min(1),
    subdomain: z.string().min(1),
  }).optional(),
});

// Processing config schemas
export const updateProcessingConfigSchema = z.object({
  deidentifyNames: z.boolean().optional(),
  deidentifyEmails: z.boolean().optional(),
  deidentifyPhones: z.boolean().optional(),
  deidentifyCompanies: z.boolean().optional(),
  deidentifyAddresses: z.boolean().optional(),
  minMessageLength: z.number().int().min(0).nullable().optional(),
  excludeStatuses: z.array(z.string()).nullable().optional(),
  dateRangeStart: z.string().datetime().nullable().optional(),
  dateRangeEnd: z.string().datetime().nullable().optional(),
});

// Admin schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(255),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateApiSourceInput = z.infer<typeof createApiSourceSchema>;
export type SelectSheetInput = z.infer<typeof selectSheetSchema>;
export type UpdateFieldMappingsInput = z.infer<typeof updateFieldMappingsSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type UpdateProcessingConfigInput = z.infer<typeof updateProcessingConfigSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
