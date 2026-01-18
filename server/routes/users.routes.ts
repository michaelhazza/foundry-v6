import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { sendSuccess, sendPaginated } from '../lib/response';
import { parseIntParam, parseQueryInt } from '../lib/validation';
import {
  listUsers,
  getUserById,
  inviteUser,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from '../services/user.service';

const router = Router();

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).default('member'),
});

const updateRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

/**
 * GET /api/users
 * List organization users (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseQueryInt(req.query.page as string, 1, { min: 1 });
    const limit = parseQueryInt(req.query.limit as string, 20, { min: 1, max: 100 });

    const result = await listUsers(req.user!.organizationId, page, limit);
    sendPaginated(res, result.data, result.pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/invite
 * Invite a new user (admin only)
 */
router.post('/invite', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = inviteUserSchema.parse(req.body);
    const result = await inviteUser(data.email, data.role, req.user!.organizationId, req.user!.id);

    const response: { message: string; devUrl?: string } = {
      message: 'Invitation sent successfully',
    };

    if (result.devUrl) {
      response.devUrl = result.devUrl;
    }

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId
 * Get user details (admin only)
 */
router.get('/:userId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIntParam(req.params.userId as string, 'userId');
    const user = await getUserById(userId, req.user!.organizationId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:userId
 * Update user role (admin only)
 */
router.patch('/:userId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIntParam(req.params.userId as string, 'userId');
    const data = updateRoleSchema.parse(req.body);
    const user = await updateUserRole(userId, req.user!.organizationId, data.role, req.user!.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/deactivate
 * Deactivate user (admin only)
 */
router.post('/:userId/deactivate', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIntParam(req.params.userId as string, 'userId');
    const user = await deactivateUser(userId, req.user!.organizationId, req.user!.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/reactivate
 * Reactivate user (admin only)
 */
router.post('/:userId/reactivate', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIntParam(req.params.userId as string, 'userId');
    const user = await reactivateUser(userId, req.user!.organizationId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

export default router;
