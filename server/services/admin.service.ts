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
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  const result: OrganizationListItem[] = [];

  for (const org of orgs) {
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, org.id));

    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, org.id));

    result.push({
      ...org,
      userCount: userCount.count,
      projectCount: projectCount.count,
    });
  }

  return result;
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
  // Generate a random temporary password
  const tempPassword = Math.random().toString(36).slice(-12);
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

  // TODO: Send email to admin with temp password or invite link

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
      organizationId: projects.organizationId,
      status: processingRuns.status,
      totalRecords: processingRuns.totalRecords,
      processedRecords: processingRuns.processedRecords,
      startedAt: processingRuns.startedAt,
      createdAt: processingRuns.createdAt,
    })
    .from(processingRuns)
    .innerJoin(projects, eq(processingRuns.projectId, projects.id))
    .where(sql`${processingRuns.status} IN ('pending', 'processing')`)
    .orderBy(desc(processingRuns.createdAt));

  const result: ProcessingQueueItem[] = [];

  for (const run of runs) {
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, run.organizationId))
      .limit(1);

    result.push({
      id: run.id,
      projectId: run.projectId,
      projectName: run.projectName,
      organizationName: org?.name || 'Unknown',
      status: run.status,
      totalRecords: run.totalRecords,
      processedRecords: run.processedRecords,
      startedAt: run.startedAt,
      createdAt: run.createdAt,
    });
  }

  return result;
}
