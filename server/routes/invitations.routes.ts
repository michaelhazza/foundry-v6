import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authRateLimit } from '../middleware/rate-limit';
import { sendSuccess } from '../lib/response';
import { validateInvitation, acceptInvitation } from '../services/invitation.service';

const router = Router();

// Validation schemas
const acceptInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * GET /api/invitations/:token
 * Validate invitation token
 */
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const result = await validateInvitation(token);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept invitation and create user
 */
router.post('/:token/accept', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const data = acceptInvitationSchema.parse(req.body);
    const result = await acceptInvitation(token, data.name, data.password);
    sendSuccess(res, { message: 'Invitation accepted successfully', userId: result.userId });
  } catch (error) {
    next(error);
  }
});

export default router;
