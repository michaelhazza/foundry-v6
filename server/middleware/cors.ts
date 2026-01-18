import cors from 'cors';
import { env } from '../config/env';

// Replit domains pattern
const replitDomainPattern = /\.replit\.dev$|\.repl\.co$/;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Development: allow localhost
    if (env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Production: allow Replit domains
    if (replitDomainPattern.test(origin)) {
      return callback(null, true);
    }

    // Allow APP_URL origin
    if (env.APP_URL && origin === env.APP_URL) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
});
