import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { processingRateLimit } from '../middleware/rate-limit';
import { sendSuccess, sendCreated } from '../lib/response';
import { parseIntParam } from '../lib/validation';
import {
  triggerProcessingRun,
  getProcessingRun,
  listProcessingRuns,
  cancelProcessingRun,
  generatePreview,
  downloadProcessedRecords,
  downloadSampleRecords,
} from '../services/processing.service';

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:projectId/preview
 * Generate preview of processing
 */
router.post('/preview', requireAuth, processingRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const preview = await generatePreview(projectId, req.user!.organizationId);
    sendSuccess(res, preview);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/process
 * Trigger a new processing run
 */
router.post('/process', requireAuth, processingRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const run = await triggerProcessingRun(projectId, req.user!.organizationId, req.user!.id);
    sendCreated(res, run);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/runs
 * List processing runs for a project
 */
router.get('/runs', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const runs = await listProcessingRuns(projectId, req.user!.organizationId);
    sendSuccess(res, runs);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/runs/:runId
 * Get processing run details
 */
router.get('/runs/:runId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const runId = parseIntParam(req.params.runId as string, 'runId');
    const run = await getProcessingRun(runId, projectId, req.user!.organizationId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Processing run not found' },
      });
    }

    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/runs/:runId/cancel
 * Cancel a processing run
 */
router.post('/runs/:runId/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const runId = parseIntParam(req.params.runId as string, 'runId');
    const run = await cancelProcessingRun(runId, projectId, req.user!.organizationId);
    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/runs/:runId/download
 * Download processed output as JSONL
 */
router.get('/runs/:runId/download', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const runId = parseIntParam(req.params.runId as string, 'runId');
    const content = await downloadProcessedRecords(runId, projectId, req.user!.organizationId);

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="output-${runId}.jsonl"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/runs/:runId/sample
 * Download sample of processed output
 */
router.get('/runs/:runId/sample', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseIntParam(req.params.projectId as string, 'projectId');
    const runId = parseIntParam(req.params.runId as string, 'runId');
    const content = await downloadSampleRecords(runId, projectId, req.user!.organizationId);

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="sample-${runId}.jsonl"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
});

export default router;
