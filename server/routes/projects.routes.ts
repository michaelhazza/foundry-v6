import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { sendSuccess, sendCreated, sendNoContent } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../services/project.service';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

/**
 * GET /api/projects
 * List all projects for the organization
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await listProjects(req.user!.organizationId);
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await createProject(
      req.user!.organizationId,
      data.name,
      data.description ?? null
    );
    sendCreated(res, project);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId
 * Get project details
 */
router.get('/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const project = await getProjectById(projectId, req.user!.organizationId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:projectId
 * Update project
 */
router.patch('/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const data = updateProjectSchema.parse(req.body);
    const project = await updateProject(projectId, req.user!.organizationId, data);
    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete project (soft delete)
 */
router.delete('/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    await deleteProject(projectId, req.user!.organizationId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

export default router;
