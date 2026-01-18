import { BadRequestError } from '../errors';

/**
 * Parse an integer from URL parameters
 * Throws BadRequestError if invalid
 */
export function parseIntParam(value: string, paramName: string = 'id'): number {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || parsed < 1) {
    throw new BadRequestError(`Invalid ${paramName}: must be a positive integer`);
  }

  return parsed;
}

/**
 * Parse an integer from query parameters with a default value
 * Returns default if invalid or missing
 */
export function parseQueryInt(
  value: string | undefined,
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  let result = parsed;

  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }

  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Parse boolean from query parameter
 */
export function parseQueryBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}
