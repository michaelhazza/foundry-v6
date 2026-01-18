import { db } from '../db';
import {
  processingRuns,
  processedRecords,
  sources,
  fieldMappings,
  processingConfigs,
  projects,
  type ProcessingRun,
  ProcessingStatus,
} from '../db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import {
  detectAndReplacePii,
  resetCounters,
  type DetectionOptions,
} from './pii-detector.service';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';

export interface ProcessingRunDetails {
  id: number;
  projectId: number;
  status: string;
  totalRecords: number | null;
  processedRecords: number;
  filteredRecords: number;
  errorRecords: number;
  startedAt: Date | null;
  completedAt: Date | null;
  statistics: unknown;
  createdAt: Date;
}

export interface PreviewResult {
  original: string;
  processed: string;
  piiFound: Record<string, string>;
}

/**
 * Trigger a new processing run
 */
export async function triggerProcessingRun(
  projectId: number,
  organizationId: number,
  userId: number
): Promise<ProcessingRunDetails> {
  // Verify project exists
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check for existing active run
  const [activeRun] = await db
    .select({ id: processingRuns.id })
    .from(processingRuns)
    .where(and(
      eq(processingRuns.projectId, projectId),
      sql`${processingRuns.status} IN ('pending', 'processing')`
    ))
    .limit(1);

  if (activeRun) {
    throw new ConflictError('A processing run is already active for this project');
  }

  // Check if project has sources
  const projectSources = await db
    .select({ id: sources.id, recordCount: sources.recordCount })
    .from(sources)
    .where(eq(sources.projectId, projectId));

  if (projectSources.length === 0) {
    throw new BadRequestError('Project has no data sources');
  }

  // Calculate total records
  const totalRecords = projectSources.reduce(
    (sum, s) => sum + (s.recordCount || 0),
    0
  );

  // Create processing run
  const [run] = await db
    .insert(processingRuns)
    .values({
      projectId,
      triggeredById: userId,
      status: 'pending',
      totalRecords,
    })
    .returning();

  // Start processing in background
  processProjectAsync(run.id, projectId, organizationId).catch(console.error);

  return {
    id: run.id,
    projectId: run.projectId,
    status: run.status,
    totalRecords: run.totalRecords,
    processedRecords: run.processedRecords,
    filteredRecords: run.filteredRecords,
    errorRecords: run.errorRecords,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    statistics: run.statistics,
    createdAt: run.createdAt,
  };
}

/**
 * Get processing run by ID
 */
export async function getProcessingRun(
  runId: number,
  projectId: number,
  organizationId: number
): Promise<ProcessingRunDetails | null> {
  const [run] = await db
    .select()
    .from(processingRuns)
    .innerJoin(projects, eq(processingRuns.projectId, projects.id))
    .where(and(
      eq(processingRuns.id, runId),
      eq(processingRuns.projectId, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!run) {
    return null;
  }

  return {
    id: run.processing_runs.id,
    projectId: run.processing_runs.projectId,
    status: run.processing_runs.status,
    totalRecords: run.processing_runs.totalRecords,
    processedRecords: run.processing_runs.processedRecords,
    filteredRecords: run.processing_runs.filteredRecords,
    errorRecords: run.processing_runs.errorRecords,
    startedAt: run.processing_runs.startedAt,
    completedAt: run.processing_runs.completedAt,
    statistics: run.processing_runs.statistics,
    createdAt: run.processing_runs.createdAt,
  };
}

/**
 * List processing runs for a project
 */
export async function listProcessingRuns(
  projectId: number,
  organizationId: number
): Promise<ProcessingRunDetails[]> {
  // Verify project
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const runs = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.projectId, projectId))
    .orderBy(desc(processingRuns.createdAt));

  return runs.map((run) => ({
    id: run.id,
    projectId: run.projectId,
    status: run.status,
    totalRecords: run.totalRecords,
    processedRecords: run.processedRecords,
    filteredRecords: run.filteredRecords,
    errorRecords: run.errorRecords,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    statistics: run.statistics,
    createdAt: run.createdAt,
  }));
}

/**
 * Cancel a processing run
 */
export async function cancelProcessingRun(
  runId: number,
  projectId: number,
  organizationId: number
): Promise<ProcessingRunDetails> {
  const run = await getProcessingRun(runId, projectId, organizationId);

  if (!run) {
    throw new NotFoundError('Processing run not found');
  }

  if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
    throw new BadRequestError('Processing run is already finished');
  }

  await db
    .update(processingRuns)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(processingRuns.id, runId));

  return { ...run, status: 'cancelled', completedAt: new Date() };
}

/**
 * Generate preview of processing
 */
export async function generatePreview(
  projectId: number,
  organizationId: number,
  sampleSize: number = 5
): Promise<PreviewResult[]> {
  // Verify project
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Get processing config
  const [config] = await db
    .select()
    .from(processingConfigs)
    .where(eq(processingConfigs.projectId, projectId))
    .limit(1);

  if (!config) {
    throw new BadRequestError('Processing config not found');
  }

  // Get first source with data
  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.projectId, projectId), eq(sources.status, 'parsed')))
    .limit(1);

  if (!source) {
    throw new BadRequestError('No parsed data sources found');
  }

  // Get field mappings
  const mappings = await db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.sourceId, source.id));

  // Find message content column
  const messageMapping = mappings.find((m) => m.targetField === 'message_content');

  if (!messageMapping) {
    throw new BadRequestError('No message content field mapped');
  }

  // Read sample records from source
  const records = await readSourceRecords(source, sampleSize);

  // Generate preview for each record
  resetCounters();
  const previews: PreviewResult[] = [];

  const detectionOptions: DetectionOptions = {
    detectNames: config.detectNames,
    detectEmails: config.detectEmails,
    detectPhones: config.detectPhones,
    detectCompanies: config.detectCompanies,
    detectAddresses: config.detectAddresses,
  };

  for (const record of records) {
    const originalContent = String(record[messageMapping.sourceColumn] || '');

    if (!originalContent.trim()) continue;

    const result = detectAndReplacePii(originalContent, detectionOptions);

    previews.push({
      original: originalContent,
      processed: result.text,
      piiFound: result.piiMappings,
    });
  }

  return previews;
}

/**
 * Read records from a source file
 */
async function readSourceRecords(
  source: typeof sources.$inferSelect,
  limit?: number
): Promise<Record<string, unknown>[]> {
  if (!source.filePath) {
    throw new BadRequestError('Source file not found');
  }

  const buffer = await fs.readFile(source.filePath);

  if (source.fileType === 'csv') {
    const records = csvParse(buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[];
    return limit ? records.slice(0, limit) : records;
  }

  if (source.fileType === 'xlsx') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = source.selectedSheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return limit ? records.slice(0, limit) : records;
  }

  if (source.fileType === 'json') {
    const data = JSON.parse(buffer.toString('utf-8'));
    const records = Array.isArray(data) ? data : [data];
    return limit ? records.slice(0, limit) : records;
  }

  throw new BadRequestError('Unsupported file type');
}

/**
 * Background processing function
 */
async function processProjectAsync(
  runId: number,
  projectId: number,
  _organizationId: number
): Promise<void> {
  try {
    // Mark as processing
    await db
      .update(processingRuns)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(processingRuns.id, runId));

    // Get config
    const [config] = await db
      .select()
      .from(processingConfigs)
      .where(eq(processingConfigs.projectId, projectId))
      .limit(1);

    if (!config) {
      throw new Error('Processing config not found');
    }

    const detectionOptions: DetectionOptions = {
      detectNames: config.detectNames,
      detectEmails: config.detectEmails,
      detectPhones: config.detectPhones,
      detectCompanies: config.detectCompanies,
      detectAddresses: config.detectAddresses,
    };

    // Get all sources
    const projectSources = await db
      .select()
      .from(sources)
      .where(and(eq(sources.projectId, projectId), eq(sources.status, 'parsed')));

    let processedCount = 0;
    let filteredCount = 0;
    let errorCount = 0;
    let rowNumber = 0;

    const piiCounts = { names: 0, emails: 0, phones: 0, companies: 0, addresses: 0 };

    resetCounters();

    for (const source of projectSources) {
      // Get field mappings
      const mappings = await db
        .select()
        .from(fieldMappings)
        .where(eq(fieldMappings.sourceId, source.id));

      const messageMapping = mappings.find((m) => m.targetField === 'message_content');

      if (!messageMapping) continue;

      // Read all records
      const records = await readSourceRecords(source);

      for (const record of records) {
        rowNumber++;

        // Check if run was cancelled
        const [currentRun] = await db
          .select({ status: processingRuns.status })
          .from(processingRuns)
          .where(eq(processingRuns.id, runId))
          .limit(1);

        if (currentRun?.status === 'cancelled') {
          return;
        }

        try {
          const content = String(record[messageMapping.sourceColumn] || '');

          // Apply filters
          if (config.minMessageLength && content.length < config.minMessageLength) {
            filteredCount++;
            await db.insert(processedRecords).values({
              processingRunId: runId,
              sourceRowNumber: rowNumber,
              content: { messages: [], metadata: {} },
              wasFiltered: true,
              filterReason: 'Below minimum message length',
            });
            continue;
          }

          // Get other mapped fields
          const senderNameMapping = mappings.find((m) => m.targetField === 'sender_name');
          const senderRoleMapping = mappings.find((m) => m.targetField === 'sender_role');
          const timestampMapping = mappings.find((m) => m.targetField === 'timestamp');
          const ticketIdMapping = mappings.find((m) => m.targetField === 'ticket_id');
          const subjectMapping = mappings.find((m) => m.targetField === 'subject');

          // Detect role (agent vs customer)
          let role: 'agent' | 'customer' | 'unknown' = 'unknown';
          if (senderRoleMapping) {
            const roleValue = String(record[senderRoleMapping.sourceColumn] || '').toLowerCase();
            if (config.agentRoleValue && roleValue.includes(config.agentRoleValue.toLowerCase())) {
              role = 'agent';
            } else if (config.customerRoleValue && roleValue.includes(config.customerRoleValue.toLowerCase())) {
              role = 'customer';
            }
          }

          // Apply PII detection
          const result = detectAndReplacePii(content, detectionOptions);

          // Update PII counts
          piiCounts.names += result.counts.names;
          piiCounts.emails += result.counts.emails;
          piiCounts.phones += result.counts.phones;
          piiCounts.companies += result.counts.companies;
          piiCounts.addresses += result.counts.addresses;

          // Build processed content
          const processedContent = {
            messages: [{ role, content: result.text }],
            metadata: {
              ticketId: ticketIdMapping ? String(record[ticketIdMapping.sourceColumn] || '') : undefined,
              subject: subjectMapping ? String(record[subjectMapping.sourceColumn] || '') : undefined,
              timestamp: timestampMapping ? String(record[timestampMapping.sourceColumn] || '') : undefined,
            },
          };

          await db.insert(processedRecords).values({
            processingRunId: runId,
            sourceRowNumber: rowNumber,
            content: processedContent,
            piiMappings: result.piiMappings,
            wasFiltered: false,
            hasError: false,
          });

          processedCount++;

          // Update progress every 10 records
          if (processedCount % 10 === 0) {
            await db
              .update(processingRuns)
              .set({
                processedRecords: processedCount,
                filteredRecords: filteredCount,
                errorRecords: errorCount,
                updatedAt: new Date(),
              })
              .where(eq(processingRuns.id, runId));
          }
        } catch (error) {
          errorCount++;
          await db.insert(processedRecords).values({
            processingRunId: runId,
            sourceRowNumber: rowNumber,
            content: { messages: [], metadata: {} },
            hasError: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Mark as completed
    await db
      .update(processingRuns)
      .set({
        status: 'completed',
        processedRecords: processedCount,
        filteredRecords: filteredCount,
        errorRecords: errorCount,
        completedAt: new Date(),
        updatedAt: new Date(),
        statistics: {
          piiCounts,
          filterBreakdown: { minLength: filteredCount, status: 0, dateRange: 0 },
          errors: [],
        },
      })
      .where(eq(processingRuns.id, runId));
  } catch (error) {
    // Mark as failed
    await db
      .update(processingRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(processingRuns.id, runId));
  }
}

/**
 * Download processed records as JSONL
 */
export async function downloadProcessedRecords(
  runId: number,
  projectId: number,
  organizationId: number
): Promise<string> {
  const run = await getProcessingRun(runId, projectId, organizationId);

  if (!run) {
    throw new NotFoundError('Processing run not found');
  }

  if (run.status !== 'completed') {
    throw new BadRequestError('Processing run is not completed');
  }

  const records = await db
    .select({ content: processedRecords.content })
    .from(processedRecords)
    .where(and(
      eq(processedRecords.processingRunId, runId),
      eq(processedRecords.wasFiltered, false),
      eq(processedRecords.hasError, false)
    ))
    .orderBy(processedRecords.sourceRowNumber);

  // Generate JSONL format
  return records.map((r) => JSON.stringify(r.content)).join('\n');
}

/**
 * Get sample records for preview download
 */
export async function downloadSampleRecords(
  runId: number,
  projectId: number,
  organizationId: number,
  sampleSize: number = 10
): Promise<string> {
  const run = await getProcessingRun(runId, projectId, organizationId);

  if (!run) {
    throw new NotFoundError('Processing run not found');
  }

  if (run.status !== 'completed') {
    throw new BadRequestError('Processing run is not completed');
  }

  const records = await db
    .select({ content: processedRecords.content })
    .from(processedRecords)
    .where(and(
      eq(processedRecords.processingRunId, runId),
      eq(processedRecords.wasFiltered, false),
      eq(processedRecords.hasError, false)
    ))
    .orderBy(processedRecords.sourceRowNumber)
    .limit(sampleSize);

  return records.map((r) => JSON.stringify(r.content)).join('\n');
}
