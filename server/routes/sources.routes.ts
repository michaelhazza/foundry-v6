import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadRateLimit } from '../middleware/rate-limit';
import { sendSuccess, sendCreated, sendNoContent } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import {
  listSources,
  getSourceById,
  createFileSource,
  createApiSource,
  selectExcelSheet,
  deleteSource,
  getFieldMappings,
  updateFieldMappings,
} from '../services/source.service';

const router = Router({ mergeParams: true });

// Validation schemas
const selectSheetSchema = z.object({
  sheetName: z.string().min(1, 'Sheet name is required'),
});

const updateMappingsSchema = z.object({
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.enum([
      'message_content',
      'sender_name',
      'sender_email',
      'sender_role',
      'timestamp',
      'ticket_id',
      'status',
      'subject',
      'custom',
    ]).nullable(),
  })),
});

const createApiSourceSchema = z.object({
  connectionId: z.number().int().positive(),
  config: z.object({
    inbox: z.string().optional(),
    status: z.string().optional(),
    dateRangeStart: z.string().datetime().optional(),
    dateRangeEnd: z.string().datetime().optional(),
  }).optional().default({}),
});

/**
 * GET /api/projects/:projectId/sources
 * List all sources for a project
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceList = await listSources(projectId, req.user!.organizationId);
    sendSuccess(res, sourceList);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/sources/upload
 * Upload a file source
 */
router.post(
  '/upload',
  requireAuth,
  uploadRateLimit,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseIntParam(req.params.projectId as string, 'projectId');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'No file uploaded' },
        });
      }

      const source = await createFileSource(projectId, req.user!.organizationId, req.file);
      sendCreated(res, source);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/projects/:projectId/sources/api
 * Create an API data source from a connection
 */
router.post('/api', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const data = createApiSourceSchema.parse(req.body);
    const source = await createApiSource(
      projectId,
      req.user!.organizationId,
      data.connectionId,
      data.config
    );
    sendCreated(res, source);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/sources/:sourceId
 * Get source details
 */
router.get('/:sourceId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceId = parseIntParam(req.params.sourceId as string, 'sourceId');
    const source = await getSourceById(sourceId, projectId, req.user!.organizationId);

    if (!source) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Source not found' },
      });
    }

    sendSuccess(res, source);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/sources/:sourceId
 * Delete a source
 */
router.delete('/:sourceId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceId = parseIntParam(req.params.sourceId as string, 'sourceId');
    await deleteSource(sourceId, projectId, req.user!.organizationId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/sources/:sourceId/select-sheet
 * Select a sheet from an Excel source
 */
router.post('/:sourceId/select-sheet', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceId = parseIntParam(req.params.sourceId as string, 'sourceId');
    const data = selectSheetSchema.parse(req.body);
    const source = await selectExcelSheet(sourceId, projectId, req.user!.organizationId, data.sheetName);
    sendSuccess(res, source);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/sources/:sourceId/mappings
 * Get field mappings for a source
 */
router.get('/:sourceId/mappings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceId = parseIntParam(req.params.sourceId as string, 'sourceId');
    const mappings = await getFieldMappings(sourceId, projectId, req.user!.organizationId);
    sendSuccess(res, mappings);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:projectId/sources/:sourceId/mappings
 * Update field mappings for a source
 */
router.patch('/:sourceId/mappings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const sourceId = parseIntParam(req.params.sourceId as string, 'sourceId');
    const data = updateMappingsSchema.parse(req.body);
    const mappings = await updateFieldMappings(sourceId, projectId, req.user!.organizationId, data.mappings);
    sendSuccess(res, mappings);
  } catch (error) {
    next(error);
  }
});

export default router;
