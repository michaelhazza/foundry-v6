import { db } from '../db';
import { processingConfigs, projects, type ProcessingConfig } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError } from '../errors';

export interface ProcessingConfigDetails {
  id: number;
  projectId: number;
  deIdentificationEnabled: boolean;
  detectNames: boolean;
  detectEmails: boolean;
  detectPhones: boolean;
  detectCompanies: boolean;
  detectAddresses: boolean;
  minMessageLength: number | null;
  minCharacterCount: number | null;
  resolvedStatusField: string | null;
  resolvedStatusValue: string | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  roleIdentifierField: string | null;
  agentRoleValue: string | null;
  customerRoleValue: string | null;
}

/**
 * Get processing config for a project
 */
export async function getProcessingConfig(
  projectId: number,
  organizationId: number
): Promise<ProcessingConfigDetails | null> {
  // Verify project belongs to organization
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const [config] = await db
    .select()
    .from(processingConfigs)
    .where(eq(processingConfigs.projectId, projectId))
    .limit(1);

  if (!config) {
    return null;
  }

  return {
    id: config.id,
    projectId: config.projectId,
    deIdentificationEnabled: config.deIdentificationEnabled,
    detectNames: config.detectNames,
    detectEmails: config.detectEmails,
    detectPhones: config.detectPhones,
    detectCompanies: config.detectCompanies,
    detectAddresses: config.detectAddresses,
    minMessageLength: config.minMessageLength,
    minCharacterCount: config.minCharacterCount,
    resolvedStatusField: config.resolvedStatusField,
    resolvedStatusValue: config.resolvedStatusValue,
    dateRangeStart: config.dateRangeStart,
    dateRangeEnd: config.dateRangeEnd,
    roleIdentifierField: config.roleIdentifierField,
    agentRoleValue: config.agentRoleValue,
    customerRoleValue: config.customerRoleValue,
  };
}

/**
 * Update processing config
 */
export async function updateProcessingConfig(
  projectId: number,
  organizationId: number,
  data: Partial<Omit<ProcessingConfigDetails, 'id' | 'projectId'>>
): Promise<ProcessingConfigDetails> {
  // Verify project belongs to organization
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const [existingConfig] = await db
    .select({ id: processingConfigs.id })
    .from(processingConfigs)
    .where(eq(processingConfigs.projectId, projectId))
    .limit(1);

  if (!existingConfig) {
    throw new NotFoundError('Processing config not found');
  }

  const updateData: Partial<ProcessingConfig> = {
    updatedAt: new Date(),
  };

  // Map all possible fields
  if (data.deIdentificationEnabled !== undefined) {
    updateData.deIdentificationEnabled = data.deIdentificationEnabled;
  }
  if (data.detectNames !== undefined) {
    updateData.detectNames = data.detectNames;
  }
  if (data.detectEmails !== undefined) {
    updateData.detectEmails = data.detectEmails;
  }
  if (data.detectPhones !== undefined) {
    updateData.detectPhones = data.detectPhones;
  }
  if (data.detectCompanies !== undefined) {
    updateData.detectCompanies = data.detectCompanies;
  }
  if (data.detectAddresses !== undefined) {
    updateData.detectAddresses = data.detectAddresses;
  }
  if (data.minMessageLength !== undefined) {
    updateData.minMessageLength = data.minMessageLength;
  }
  if (data.minCharacterCount !== undefined) {
    updateData.minCharacterCount = data.minCharacterCount;
  }
  if (data.resolvedStatusField !== undefined) {
    updateData.resolvedStatusField = data.resolvedStatusField;
  }
  if (data.resolvedStatusValue !== undefined) {
    updateData.resolvedStatusValue = data.resolvedStatusValue;
  }
  if (data.dateRangeStart !== undefined) {
    updateData.dateRangeStart = data.dateRangeStart;
  }
  if (data.dateRangeEnd !== undefined) {
    updateData.dateRangeEnd = data.dateRangeEnd;
  }
  if (data.roleIdentifierField !== undefined) {
    updateData.roleIdentifierField = data.roleIdentifierField;
  }
  if (data.agentRoleValue !== undefined) {
    updateData.agentRoleValue = data.agentRoleValue;
  }
  if (data.customerRoleValue !== undefined) {
    updateData.customerRoleValue = data.customerRoleValue;
  }

  await db
    .update(processingConfigs)
    .set(updateData)
    .where(eq(processingConfigs.projectId, projectId));

  return (await getProcessingConfig(projectId, organizationId))!;
}
