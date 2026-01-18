import { db } from '../db';
import {
  projects,
  sources,
  processingConfigs,
  processingRuns,
  type Project,
  type Source,
  type ProcessingConfig,
} from '../db/schema';
import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../errors';

export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceCount?: number;
  latestRunStatus?: string | null;
}

export interface ProjectDetails extends ProjectListItem {
  sources: Source[];
  config: ProcessingConfig | null;
}

/**
 * List projects for an organization
 */
export async function listProjects(organizationId: number): Promise<ProjectListItem[]> {
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
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .orderBy(desc(projects.updatedAt));

  // Get source counts and latest run status
  const result: ProjectListItem[] = [];

  for (const project of projectList) {
    const [sourceCount] = await db
      .select({ count: count() })
      .from(sources)
      .where(eq(sources.projectId, project.id));

    const [latestRun] = await db
      .select({ status: processingRuns.status })
      .from(processingRuns)
      .where(eq(processingRuns.projectId, project.id))
      .orderBy(desc(processingRuns.createdAt))
      .limit(1);

    result.push({
      ...project,
      sourceCount: sourceCount.count,
      latestRunStatus: latestRun?.status || null,
    });
  }

  return result;
}

/**
 * Get project by ID with details
 */
export async function getProjectById(
  projectId: number,
  organizationId: number
): Promise<ProjectDetails | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    return null;
  }

  const projectSources = await db
    .select()
    .from(sources)
    .where(eq(sources.projectId, projectId))
    .orderBy(desc(sources.createdAt));

  const [config] = await db
    .select()
    .from(processingConfigs)
    .where(eq(processingConfigs.projectId, projectId))
    .limit(1);

  return {
    ...project,
    sources: projectSources,
    config: config || null,
  };
}

/**
 * Create a new project with default config
 */
export async function createProject(
  organizationId: number,
  name: string,
  description: string | null
): Promise<ProjectDetails> {
  // Check for duplicate name
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.organizationId, organizationId),
      eq(projects.name, name),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (existing) {
    throw new ConflictError('A project with this name already exists');
  }

  // Create project with default config in transaction
  const result = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        organizationId,
        name,
        description,
      })
      .returning();

    const [config] = await tx
      .insert(processingConfigs)
      .values({
        projectId: project.id,
      })
      .returning();

    return { project, config };
  });

  return {
    ...result.project,
    sources: [],
    config: result.config,
  };
}

/**
 * Update project
 */
export async function updateProject(
  projectId: number,
  organizationId: number,
  data: { name?: string; description?: string | null }
): Promise<ProjectDetails> {
  const project = await getProjectById(projectId, organizationId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check for duplicate name if name is being changed
  if (data.name && data.name !== project.name) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        eq(projects.name, data.name),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (existing) {
      throw new ConflictError('A project with this name already exists');
    }
  }

  const updateData: Partial<Project> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, projectId));

  return (await getProjectById(projectId, organizationId))!;
}

/**
 * Soft delete project
 */
export async function deleteProject(
  projectId: number,
  organizationId: number
): Promise<void> {
  const project = await getProjectById(projectId, organizationId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if there's an active processing run
  const [activeRun] = await db
    .select({ id: processingRuns.id })
    .from(processingRuns)
    .where(and(
      eq(processingRuns.projectId, projectId),
      eq(processingRuns.status, 'processing')
    ))
    .limit(1);

  if (activeRun) {
    throw new ConflictError('Cannot delete project with active processing run');
  }

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}
