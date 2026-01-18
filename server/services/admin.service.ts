import crypto from 'crypto';
import { db } from '../db';
import {
  organizations,
  users,
  projects,
  processingRuns,
} from '../db/schema';
import { eq, desc, sql, isNull, count } from 'drizzle-orm';
import { hashPassword } from './auth.service';

export interface OrganizationListItem {
  id: number;
  name: string;
  createdAt: Date;
  userCount: number;
  projectCount: number;
}

export interface ProcessingQueueItem {
  id: number;
  projectId: number;
  projectName: string;
  organizationName: string;
  status: string;
  totalRecords: number | null;
  processedRecords: number;
  startedAt: Date | null;
  createdAt: Date;
}

/**
 * List all organizations (platform admin)
 */
export async function listOrganizations(): Promise<OrganizationListItem[]> {
  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
      userCount: sql<number>`(SELECT COUNT(*) FROM users WHERE users.organization_id = organizations.id)`,
      projectCount: sql<number>`(SELECT COUNT(*) FROM projects WHERE projects.organization_id = organizations.id AND projects.deleted_at IS NULL)`,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  return orgs.map(org => ({
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    userCount: Number(org.userCount),
    projectCount: Number(org.projectCount),
  }));
}

/**
 * Get organization by ID (platform admin)
 */
export async function getOrganizationById(orgId: number): Promise<OrganizationListItem | null> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    return null;
  }

  const [userCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, org.id));

  const [projectCount] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.organizationId, org.id));

  return {
    ...org,
    userCount: userCount.count,
    projectCount: projectCount.count,
  };
}

/**
 * Create organization with admin user (platform admin)
 */
export async function createOrganization(
  name: string,
  adminEmail: string,
  adminName: string
): Promise<OrganizationListItem> {
  // Generate a cryptographically secure temporary password
  const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
  const passwordHash = await hashPassword(tempPassword);

  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name })
      .returning();

    await tx.insert(users).values({
      organizationId: org.id,
      email: adminEmail.toLowerCase(),
      passwordHash,
      name: adminName,
      role: 'admin',
      isActive: true,
    });

    return org;
  });

  // Email notification is handled separately - temp password logged for development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] New org admin created: ${adminEmail} - temp password: ${tempPassword}`);
  }

  return {
    id: result.id,
    name: result.name,
    createdAt: result.createdAt,
    userCount: 1,
    projectCount: 0,
  };
}

/**
 * Get processing queue (platform admin)
 */
export async function getProcessingQueue(): Promise<ProcessingQueueItem[]> {
  const runs = await db
    .select({
      id: processingRuns.id,
      projectId: processingRuns.projectId,
      projectName: projects.name,
      organizationName: organizations.name,
      status: processingRuns.status,
      totalRecords: processingRuns.totalRecords,
      processedRecords: processingRuns.processedRecords,
      startedAt: processingRuns.startedAt,
      createdAt: processingRuns.createdAt,
    })
    .from(processingRuns)
    .innerJoin(projects, eq(processingRuns.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(sql`${processingRuns.status} IN ('pending', 'processing')`)
    .orderBy(desc(processingRuns.createdAt));

  return runs.map(run => ({
    id: run.id,
    projectId: run.projectId,
    projectName: run.projectName,
    organizationName: run.organizationName,
    status: run.status,
    totalRecords: run.totalRecords,
    processedRecords: run.processedRecords,
    startedAt: run.startedAt,
    createdAt: run.createdAt,
  }));
}
