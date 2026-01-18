import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { sendSuccess, sendCreated, sendNoContent } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import {
  listConnections,
  getConnectionById,
  createConnection,
  updateConnection,
  deleteConnection,
  testConnection,
} from '../services/connection.service';

const router = Router();

// Validation schemas
const createConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['teamwork_desk']),
  credentials: z.object({
    apiKey: z.string().min(1, 'API key is required'),
    subdomain: z.string().min(1, 'Subdomain is required'),
  }),
});

const updateConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  credentials: z.object({
    apiKey: z.string().min(1),
    subdomain: z.string().min(1),
  }).optional(),
});

/**
 * GET /api/connections
 * List all connections (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionList = await listConnections(req.user!.organizationId);
    sendSuccess(res, connectionList);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/connections
 * Create a new connection (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createConnectionSchema.parse(req.body);
    const connection = await createConnection(
      req.user!.organizationId,
      data.name,
      data.type,
      data.credentials
    );
    sendCreated(res, connection);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:connectionId
 * Get connection details (admin only)
 */
router.get('/:connectionId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionId = parseIntParam(req.params.connectionId as string, 'connectionId');
    const connection = await getConnectionById(connectionId, req.user!.organizationId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' },
      });
    }

    sendSuccess(res, connection);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/connections/:connectionId
 * Update connection (admin only)
 */
router.patch('/:connectionId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionId = parseIntParam(req.params.connectionId as string, 'connectionId');
    const data = updateConnectionSchema.parse(req.body);
    const connection = await updateConnection(connectionId, req.user!.organizationId, data);
    sendSuccess(res, connection);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/connections/:connectionId
 * Delete connection (admin only)
 */
router.delete('/:connectionId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionId = parseIntParam(req.params.connectionId as string, 'connectionId');
    await deleteConnection(connectionId, req.user!.organizationId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/connections/:connectionId/test
 * Test connection credentials (admin only)
 */
router.post('/:connectionId/test', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionId = parseIntParam(req.params.connectionId as string, 'connectionId');
    const result = await testConnection(connectionId, req.user!.organizationId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
