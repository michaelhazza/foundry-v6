import { Express } from 'express';
import { standardRateLimit } from '../middleware/rate-limit';
import authRoutes from './auth.routes';
import invitationsRoutes from './invitations.routes';
import usersRoutes from './users.routes';
import projectsRoutes from './projects.routes';
import sourcesRoutes from './sources.routes';
import configRoutes from './config.routes';
import processingRoutes from './processing.routes';
import connectionsRoutes from './connections.routes';
import adminRoutes from './admin.routes';

export function registerRoutes(app: Express) {
  // Apply standard rate limit to all /api routes
  app.use('/api', standardRateLimit);

  // Auth routes
  app.use('/api/auth', authRoutes);
  app.use('/api/invitations', invitationsRoutes);

  // User management routes
  app.use('/api/users', usersRoutes);

  // Project routes (with nested sources, config, and processing)
  app.use('/api/projects', projectsRoutes);
  app.use('/api/projects/:projectId/sources', sourcesRoutes);
  app.use('/api/projects/:projectId/config', configRoutes);
  app.use('/api/projects/:projectId', processingRoutes);

  // Connection routes
  app.use('/api/connections', connectionsRoutes);

  // Platform admin routes
  app.use('/api/admin', adminRoutes);
}
