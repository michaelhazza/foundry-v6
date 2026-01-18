import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { BadRequestError } from '../errors';

export interface ParsedFile {
  columns: string[];
  sampleValues: Record<string, string[]>;
  rowCount: number;
  sheets?: string[]; // For Excel files
  selectedSheet?: string;
}

const MAX_SAMPLE_VALUES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Parse a CSV file
 */
export function parseCSV(buffer: Buffer): ParsedFile {
  try {
    const content = buffer.toString('utf-8');
    const records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    if (records.length === 0) {
      throw new BadRequestError('CSV file is empty or has no data rows');
    }

    const columns = Object.keys(records[0]);
    const sampleValues: Record<string, string[]> = {};

    columns.forEach((col) => {
      sampleValues[col] = records
        .slice(0, MAX_SAMPLE_VALUES)
        .map((row) => String(row[col] || ''))
        .filter((val) => val.trim() !== '');
    });

    return {
      columns,
      sampleValues,
      rowCount: records.length,
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError(
      `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse an Excel file and return available sheets
 */
export function parseExcel(buffer: Buffer): ParsedFile {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames;

    if (sheets.length === 0) {
      throw new BadRequestError('Excel file has no sheets');
    }

    // Parse the first sheet by default
    return parseExcelSheet(buffer, sheets[0]);
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse a specific sheet from an Excel file
 */
export function parseExcelSheet(buffer: Buffer, sheetName: string): ParsedFile {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames;

    if (!sheets.includes(sheetName)) {
      throw new BadRequestError(`Sheet "${sheetName}" not found in Excel file`);
    }

    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (records.length === 0) {
      throw new BadRequestError('Selected sheet is empty or has no data rows');
    }

    const columns = Object.keys(records[0]);
    const sampleValues: Record<string, string[]> = {};

    columns.forEach((col) => {
      sampleValues[col] = records
        .slice(0, MAX_SAMPLE_VALUES)
        .map((row) => String(row[col] ?? ''))
        .filter((val) => val.trim() !== '');
    });

    return {
      columns,
      sampleValues,
      rowCount: records.length,
      sheets,
      selectedSheet: sheetName,
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError(
      `Failed to parse Excel sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse a JSON file (array of objects)
 */
export function parseJSON(buffer: Buffer): ParsedFile {
  try {
    const content = buffer.toString('utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new BadRequestError('JSON file must contain an array of objects');
    }

    if (data.length === 0) {
      throw new BadRequestError('JSON file is empty');
    }

    if (typeof data[0] !== 'object' || data[0] === null) {
      throw new BadRequestError('JSON array must contain objects');
    }

    const columns = Object.keys(data[0]);
    const sampleValues: Record<string, string[]> = {};

    columns.forEach((col) => {
      sampleValues[col] = data
        .slice(0, MAX_SAMPLE_VALUES)
        .map((row: Record<string, unknown>) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        })
        .filter((val: string) => val.trim() !== '');
    });

    return {
      columns,
      sampleValues,
      rowCount: data.length,
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new BadRequestError('Invalid JSON format');
    }
    throw new BadRequestError(
      `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse a file based on its type
 */
export function parseFile(buffer: Buffer, mimeType: string, fileName: string): ParsedFile {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new BadRequestError('File size exceeds 50MB limit');
  }

  const extension = fileName.split('.').pop()?.toLowerCase();

  if (mimeType === 'text/csv' || extension === 'csv') {
    return parseCSV(buffer);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    extension === 'xlsx' ||
    extension === 'xls'
  ) {
    return parseExcel(buffer);
  }

  if (mimeType === 'application/json' || extension === 'json') {
    return parseJSON(buffer);
  }

  throw new BadRequestError(
    'Unsupported file type. Please upload a CSV, Excel (.xlsx), or JSON file.'
  );
}

/**
 * Get file type from MIME type or extension
 */
export function getFileType(mimeType: string, fileName: string): 'csv' | 'xlsx' | 'json' {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (mimeType === 'text/csv' || extension === 'csv') {
    return 'csv';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    extension === 'xlsx' ||
    extension === 'xls'
  ) {
    return 'xlsx';
  }

  if (mimeType === 'application/json' || extension === 'json') {
    return 'json';
  }

  throw new BadRequestError('Unsupported file type');
}
