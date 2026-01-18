import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { sendSuccess } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import { getProcessingConfig, updateProcessingConfig } from '../services/processing-config.service';

const router = Router({ mergeParams: true });

// Validation schemas
const updateConfigSchema = z.object({
  deIdentificationEnabled: z.boolean().optional(),
  detectNames: z.boolean().optional(),
  detectEmails: z.boolean().optional(),
  detectPhones: z.boolean().optional(),
  detectCompanies: z.boolean().optional(),
  detectAddresses: z.boolean().optional(),
  minMessageLength: z.number().int().min(0).nullable().optional(),
  minCharacterCount: z.number().int().min(0).nullable().optional(),
  resolvedStatusField: z.string().nullable().optional(),
  resolvedStatusValue: z.string().nullable().optional(),
  dateRangeStart: z.string().datetime().nullable().optional().transform(val => val ? new Date(val) : null),
  dateRangeEnd: z.string().datetime().nullable().optional().transform(val => val ? new Date(val) : null),
  roleIdentifierField: z.string().nullable().optional(),
  agentRoleValue: z.string().nullable().optional(),
  customerRoleValue: z.string().nullable().optional(),
});

/**
 * GET /api/projects/:projectId/config
 * Get processing config for a project
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const config = await getProcessingConfig(projectId, req.user!.organizationId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Processing config not found' },
      });
    }

    sendSuccess(res, config);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:projectId/config
 * Update processing config
 */
router.patch('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const data = updateConfigSchema.parse(req.body);
    const config = await updateProcessingConfig(projectId, req.user!.organizationId, data);
    sendSuccess(res, config);
  } catch (error) {
    next(error);
  }
});

export default router;
