import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
  next(error);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    const errorObj: { code: string; message: string; details?: unknown } = {
      code: err.code,
      message: err.message,
    };
    if (err.details) {
      errorObj.details = err.details;
    }
    const response: ErrorResponse = {
      success: false,
      error: errorObj,
    };
    return res.status(err.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as unknown as { issues: Array<{ path: string[]; message: string }> };
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
    return res.status(422).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    };
    return res.status(401).json(response);
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  };
  return res.status(500).json(response);
}
