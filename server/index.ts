import express from 'express';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { closeDatabase } from './db';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { registerRoutes } from './routes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(corsMiddleware);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (before auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register API routes
registerRoutes(app);

// Production static serving
if (env.NODE_ENV === 'production') {
  const staticPath = path.join(process.cwd(), 'dist/public');
  app.use(express.static(staticPath));

  // SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
});
