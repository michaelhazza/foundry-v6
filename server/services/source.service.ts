import { db } from '../db';
import {
  sources,
  fieldMappings,
  projects,
  connections,
  type Source,
  type FieldMapping,
} from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../errors';
import { parseFile, parseExcelSheet, getFileType, type ParsedFile } from './file-parser.service';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = './uploads';
const FILE_RETENTION_DAYS = 30;

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

export interface SourceListItem {
  id: number;
  name: string;
  type: string;
  recordCount: number | null;
  status: string;
  createdAt: Date;
  fileName?: string | null;
  connectionId?: number | null;
}

export interface SourceDetails extends SourceListItem {
  detectedColumns: string[] | null;
  mappings: FieldMapping[];
  sheets?: string[];
  selectedSheet?: string | null;
}

/**
 * Auto-suggest field mappings based on column names
 */
function suggestFieldMappings(columns: string[]): Array<{
  sourceColumn: string;
  targetField: string | null;
  confidence: string;
}> {
  const suggestions: Array<{
    sourceColumn: string;
    targetField: string | null;
    confidence: string;
  }> = [];

  const patterns: Array<{
    pattern: RegExp;
    targetField: string;
    confidence: string;
  }> = [
    { pattern: /^(message|content|body|text|description)$/i, targetField: 'message_content', confidence: 'high' },
    { pattern: /(message|content|body|text)/i, targetField: 'message_content', confidence: 'medium' },
    { pattern: /^(email|e-mail|email_address)$/i, targetField: 'sender_email', confidence: 'high' },
    { pattern: /(email|e-mail)/i, targetField: 'sender_email', confidence: 'medium' },
    { pattern: /^(name|sender|from|author|customer|agent)$/i, targetField: 'sender_name', confidence: 'high' },
    { pattern: /(name|sender|from|author)/i, targetField: 'sender_name', confidence: 'medium' },
    { pattern: /^(role|type|sender_type)$/i, targetField: 'sender_role', confidence: 'high' },
    { pattern: /(role|type)/i, targetField: 'sender_role', confidence: 'low' },
    { pattern: /^(timestamp|date|time|created|sent)/i, targetField: 'timestamp', confidence: 'high' },
    { pattern: /(timestamp|date|time|created)/i, targetField: 'timestamp', confidence: 'medium' },
    { pattern: /^(ticket_id|ticket|id|conversation_id|thread)/i, targetField: 'ticket_id', confidence: 'high' },
    { pattern: /(ticket|conversation|thread)/i, targetField: 'ticket_id', confidence: 'medium' },
    { pattern: /^(status|state)$/i, targetField: 'status', confidence: 'high' },
    { pattern: /(status|state)/i, targetField: 'status', confidence: 'medium' },
    { pattern: /^(subject|title|topic)$/i, targetField: 'subject', confidence: 'high' },
    { pattern: /(subject|title)/i, targetField: 'subject', confidence: 'medium' },
  ];

  for (const column of columns) {
    let matched = false;

    for (const { pattern, targetField, confidence } of patterns) {
      if (pattern.test(column)) {
        suggestions.push({ sourceColumn: column, targetField, confidence });
        matched = true;
        break;
      }
    }

    if (!matched) {
      suggestions.push({ sourceColumn: column, targetField: null, confidence: 'low' });
    }
  }

  return suggestions;
}

/**
 * Create a source from file upload
 */
export async function createFileSource(
  projectId: number,
  organizationId: number,
  file: Express.Multer.File
): Promise<SourceDetails> {
  // Verify project exists and belongs to organization
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

  // Parse the file
  const parsed = parseFile(file.buffer, file.mimetype, file.originalname);
  const fileType = getFileType(file.mimetype, file.originalname);

  // Generate unique file path and save file
  const fileId = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(UPLOAD_DIR, `${fileId}.${fileType}`);
  await fs.writeFile(filePath, file.buffer);

  // Calculate expiration date
  const expiresAt = new Date(Date.now() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Create source and field mappings in transaction
  const result = await db.transaction(async (tx) => {
    const [source] = await tx
      .insert(sources)
      .values({
        projectId,
        type: 'file',
        name: file.originalname,
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        filePath,
        selectedSheet: parsed.selectedSheet,
        recordCount: parsed.rowCount,
        detectedColumns: parsed.columns,
        status: 'parsed',
        expiresAt,
      })
      .returning();

    // Create field mappings with suggestions
    const suggestions = suggestFieldMappings(parsed.columns);
    const mappings: FieldMapping[] = [];

    for (const suggestion of suggestions) {
      const sampleVals = parsed.sampleValues[suggestion.sourceColumn] || [];
      const [mapping] = await tx
        .insert(fieldMappings)
        .values({
          sourceId: source.id,
          sourceColumn: suggestion.sourceColumn,
          targetField: suggestion.targetField,
          confidence: suggestion.confidence,
          isAutoSuggested: true,
          sampleValues: sampleVals,
        })
        .returning();

      mappings.push(mapping);
    }

    return { source, mappings };
  });

  return {
    id: result.source.id,
    name: result.source.name,
    type: result.source.type,
    recordCount: result.source.recordCount,
    status: result.source.status,
    createdAt: result.source.createdAt,
    fileName: result.source.fileName,
    detectedColumns: result.source.detectedColumns,
    mappings: result.mappings,
    sheets: parsed.sheets,
    selectedSheet: result.source.selectedSheet,
  };
}

/**
 * Select a sheet from an Excel source
 */
export async function selectExcelSheet(
  sourceId: number,
  projectId: number,
  organizationId: number,
  sheetName: string
): Promise<SourceDetails> {
  // Verify source exists and belongs to project
  const [source] = await db
    .select()
    .from(sources)
    .innerJoin(projects, eq(sources.projectId, projects.id))
    .where(and(
      eq(sources.id, sourceId),
      eq(sources.projectId, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  if (source.sources.type !== 'file' || source.sources.fileType !== 'xlsx') {
    throw new BadRequestError('Source is not an Excel file');
  }

  if (!source.sources.filePath) {
    throw new BadRequestError('Source file not found');
  }

  // Read and parse the selected sheet
  const buffer = await fs.readFile(source.sources.filePath);
  const parsed = parseExcelSheet(buffer, sheetName);

  // Update source and recreate field mappings
  await db.transaction(async (tx) => {
    // Delete existing mappings
    await tx.delete(fieldMappings).where(eq(fieldMappings.sourceId, sourceId));

    // Update source
    await tx
      .update(sources)
      .set({
        selectedSheet: sheetName,
        recordCount: parsed.rowCount,
        detectedColumns: parsed.columns,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));

    // Create new field mappings
    const suggestions = suggestFieldMappings(parsed.columns);
    for (const suggestion of suggestions) {
      const sampleVals = parsed.sampleValues[suggestion.sourceColumn] || [];
      await tx.insert(fieldMappings).values({
        sourceId,
        sourceColumn: suggestion.sourceColumn,
        targetField: suggestion.targetField,
        confidence: suggestion.confidence,
        isAutoSuggested: true,
        sampleValues: sampleVals,
      });
    }
  });

  return getSourceById(sourceId, projectId, organizationId) as Promise<SourceDetails>;
}

/**
 * List sources for a project
 */
export async function listSources(
  projectId: number,
  organizationId: number
): Promise<SourceListItem[]> {
  // Verify project belongs to organization
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

  return db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      recordCount: sources.recordCount,
      status: sources.status,
      createdAt: sources.createdAt,
      fileName: sources.fileName,
      connectionId: sources.connectionId,
    })
    .from(sources)
    .where(eq(sources.projectId, projectId))
    .orderBy(desc(sources.createdAt));
}

/**
 * Get source by ID with details
 */
export async function getSourceById(
  sourceId: number,
  projectId: number,
  organizationId: number
): Promise<SourceDetails | null> {
  // Verify source belongs to project in organization
  const [result] = await db
    .select()
    .from(sources)
    .innerJoin(projects, eq(sources.projectId, projects.id))
    .where(and(
      eq(sources.id, sourceId),
      eq(sources.projectId, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!result) {
    return null;
  }

  const mappings = await db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.sourceId, sourceId));

  // Get sheets for Excel files
  let sheets: string[] | undefined;
  if (result.sources.type === 'file' && result.sources.fileType === 'xlsx' && result.sources.filePath) {
    try {
      const buffer = await fs.readFile(result.sources.filePath);
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      sheets = workbook.SheetNames;
    } catch {
      // Ignore errors reading file
    }
  }

  return {
    id: result.sources.id,
    name: result.sources.name,
    type: result.sources.type,
    recordCount: result.sources.recordCount,
    status: result.sources.status,
    createdAt: result.sources.createdAt,
    fileName: result.sources.fileName,
    connectionId: result.sources.connectionId,
    detectedColumns: result.sources.detectedColumns,
    mappings,
    sheets,
    selectedSheet: result.sources.selectedSheet,
  };
}

/**
 * Delete source
 */
export async function deleteSource(
  sourceId: number,
  projectId: number,
  organizationId: number
): Promise<void> {
  const source = await getSourceById(sourceId, projectId, organizationId);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  // Delete file if it exists
  const [sourceRecord] = await db
    .select({ filePath: sources.filePath })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (sourceRecord?.filePath) {
    await fs.unlink(sourceRecord.filePath).catch(() => {});
  }

  // Delete source (cascades to field mappings)
  await db.delete(sources).where(eq(sources.id, sourceId));
}

/**
 * Get field mappings for a source
 */
export async function getFieldMappings(
  sourceId: number,
  projectId: number,
  organizationId: number
): Promise<FieldMapping[]> {
  const source = await getSourceById(sourceId, projectId, organizationId);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  return source.mappings;
}

/**
 * Update field mappings for a source
 */
export async function updateFieldMappings(
  sourceId: number,
  projectId: number,
  organizationId: number,
  mappings: Array<{ sourceColumn: string; targetField: string | null }>
): Promise<FieldMapping[]> {
  const source = await getSourceById(sourceId, projectId, organizationId);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  // Update each mapping
  for (const mapping of mappings) {
    await db
      .update(fieldMappings)
      .set({
        targetField: mapping.targetField,
        isAutoSuggested: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(fieldMappings.sourceId, sourceId),
        eq(fieldMappings.sourceColumn, mapping.sourceColumn)
      ));
  }

  // Return updated mappings
  return db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.sourceId, sourceId));
}

export interface ApiSourceConfig {
  inbox?: string;
  status?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

/**
 * Create a source from an API connection (e.g., Teamwork Desk)
 */
export async function createApiSource(
  projectId: number,
  organizationId: number,
  connectionId: number,
  config: ApiSourceConfig
): Promise<SourceListItem> {
  // Verify project exists and belongs to organization
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

  // Verify connection exists and belongs to organization
  const [connection] = await db
    .select({
      id: connections.id,
      name: connections.name,
      type: connections.type,
    })
    .from(connections)
    .where(and(
      eq(connections.id, connectionId),
      eq(connections.organizationId, organizationId)
    ))
    .limit(1);

  if (!connection) {
    throw new NotFoundError('Connection not found');
  }

  // Create source with pending status (data will be fetched async)
  const [source] = await db
    .insert(sources)
    .values({
      projectId,
      type: 'api',
      name: `${connection.name} Import`,
      connectionId,
      apiConfig: config,
      status: 'pending',
    })
    .returning();

  // TODO: Queue background job to fetch data from API
  // For now, return the pending source

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    recordCount: source.recordCount,
    status: source.status,
    createdAt: source.createdAt,
    connectionId: source.connectionId,
  };
}
