import crypto from 'crypto';
import { db } from '../db';
import {
  organizations,
  users,
  projects,
  processingRuns,
} from '../db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { hashPassword } from './auth.service';
import { env } from '../config/env';

export interface OrganizationListItem {
  id: number;
  name: string;
  createdAt: Date;
  userCount: number;
  projectCount: number;
}

export interface OrganizationCreateResult extends OrganizationListItem {
  tempPassword?: string; // Only returned in development mode
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
 * Generate a cryptographically secure random password
 * Uses crypto.randomBytes() instead of Math.random() for security
 */
function generateSecurePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * List all organizations with user and project counts (platform admin)
 * Uses subqueries to avoid N+1 query problem
 */
export async function listOrganizations(): Promise<OrganizationListItem[]> {
  const userCountSubquery = db
    .select({
      organizationId: users.organizationId,
      count: count().as('user_count'),
    })
    .from(users)
    .groupBy(users.organizationId)
    .as('user_counts');

  const projectCountSubquery = db
    .select({
      organizationId: projects.organizationId,
      count: count().as('project_count'),
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.organizationId)
    .as('project_counts');

  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
      userCount: sql<number>`COALESCE(${userCountSubquery.count}, 0)`,
      projectCount: sql<number>`COALESCE(${projectCountSubquery.count}, 0)`,
    })
    .from(organizations)
    .leftJoin(userCountSubquery, eq(organizations.id, userCountSubquery.organizationId))
    .leftJoin(projectCountSubquery, eq(organizations.id, projectCountSubquery.organizationId))
    .orderBy(desc(organizations.createdAt));

  return result.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    userCount: Number(row.userCount),
    projectCount: Number(row.projectCount),
  }));
}

/**
 * Get organization by ID with counts (platform admin)
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

  // Single query for both counts using UNION or parallel execution
  const [[userCount], [projectCount]] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.organizationId, org.id)),
    db.select({ count: count() }).from(projects).where(eq(projects.organizationId, org.id)),
  ]);

  return {
    ...org,
    userCount: userCount.count,
    projectCount: projectCount.count,
  };
}

/**
 * Create organization with admin user (platform admin)
 * Uses cryptographically secure password generation
 */
export async function createOrganization(
  name: string,
  adminEmail: string,
  adminName: string
): Promise<OrganizationCreateResult> {
  // Generate a cryptographically secure temporary password
  const tempPassword = generateSecurePassword(16);
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

  // In development mode, return the temp password so it can be communicated
  // In production, this would trigger an email send
  const response: OrganizationCreateResult = {
    id: result.id,
    name: result.name,
    createdAt: result.createdAt,
    userCount: 1,
    projectCount: 0,
  };

  if (env.NODE_ENV === 'development') {
    response.tempPassword = tempPassword;
    console.log(`[DEV] Organization created. Admin temp password: ${tempPassword}`);
  }

  // TODO: In production, integrate with email service to send credentials
  // Example: await emailService.sendWelcomeEmail(adminEmail, tempPassword);

  return response;
}

/**
 * Get processing queue with organization names (platform admin)
 * Uses JOIN to fetch organization names in single query
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

  return runs;
}
