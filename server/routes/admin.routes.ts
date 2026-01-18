import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth';
import { sendSuccess, sendCreated } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  getProcessingQueue,
} from '../services/admin.service';

const router = Router();

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().min(1, 'Admin name is required').max(255),
});

/**
 * GET /api/admin/organizations
 * List all organizations (platform admin only)
 */
router.get('/organizations', requireAuth, requirePlatformAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await listOrganizations();
    sendSuccess(res, orgs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/organizations
 * Create a new organization (platform admin only)
 */
router.post('/organizations', requireAuth, requirePlatformAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createOrganizationSchema.parse(req.body);
    const org = await createOrganization(data.name, data.adminEmail, data.adminName);
    sendCreated(res, org);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/organizations/:orgId
 * Get organization details (platform admin only)
 */
router.get('/organizations/:orgId', requireAuth, requirePlatformAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = parseIntParam(req.params.orgId as string, 'orgId');
    const org = await getOrganizationById(orgId);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }

    sendSuccess(res, org);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/processing-queue
 * View processing queue (platform admin only)
 */
router.get('/processing-queue', requireAuth, requirePlatformAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queue = await getProcessingQueue();
    sendSuccess(res, queue);
  } catch (error) {
    next(error);
  }
});

export default router;
