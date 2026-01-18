import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { getUserById, type AuthUser } from '../services/auth.service';
import { UserRoles } from '../db/schema';

interface JwtPayload {
  userId: number;
  organizationId: number;
  role: string;
  iat: number;
  exp: number;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Get user from database
    const user = await getUserById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to require admin role (org admin or platform admin)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== UserRoles.ADMIN && req.user.role !== UserRoles.PLATFORM_ADMIN) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

/**
 * Middleware to require platform admin role
 */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== UserRoles.PLATFORM_ADMIN) {
    return next(new ForbiddenError('Platform admin access required'));
  }

  next();
}

/**
 * Middleware to optionally authenticate (for endpoints that work with or without auth)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const user = await getUserById(payload.userId);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
}
