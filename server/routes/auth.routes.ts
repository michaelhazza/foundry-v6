import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authRateLimit } from '../middleware/rate-limit';
import { requireAuth } from '../middleware/auth';
import { sendSuccess } from '../lib/response';
import {
  login,
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  changePassword,
} from '../services/auth.service';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 */
router.post('/login', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await login(data.email, data.password);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // JWT tokens are stateless, so we just acknowledge the logout
    // Client should remove the token from storage
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, req.user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(data.email);

    // Always return success to prevent email enumeration
    const response: { message: string; devUrl?: string } = {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };

    // Include dev URL for testing in development
    if (result.devUrl) {
      response.devUrl = result.devUrl;
    }

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/reset-password/:token
 * Validate reset token
 */
router.get('/reset-password/:token', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const result = await validateResetToken(token);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await resetPassword(data.token, data.password);
    sendSuccess(res, { message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.id, data.currentPassword, data.newPassword);
    sendSuccess(res, { message: 'Password has been changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
