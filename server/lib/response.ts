import { Response } from 'express';

interface Meta {
  timestamp: string;
}

interface SuccessResponse<T> {
  data: T;
  meta: Meta;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: Meta;
}

function createMeta(): Meta {
  return {
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  const response: SuccessResponse<T> = {
    data,
    meta: createMeta(),
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T) {
  return sendSuccess(res, data, 201);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
    meta: createMeta(),
  };
  return res.status(200).json(response);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}
