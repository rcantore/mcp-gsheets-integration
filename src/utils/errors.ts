import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export class SheetsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SheetsError';
  }
}

export class AuthenticationError extends SheetsError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class ValidationError extends SheetsError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends SheetsError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found` 
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class RateLimitError extends SheetsError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
  }
}

export function handleGoogleApiError(error: unknown): never {
  logger.error('Google API error encountered', { error });

  const apiError = error as { code?: number; message?: string };

  if (apiError.code === 401 || apiError.code === 403) {
    throw new AuthenticationError('Invalid or expired credentials');
  }

  if (apiError.code === 404) {
    throw new NotFoundError('Resource');
  }

  if (apiError.code === 429) {
    throw new RateLimitError();
  }

  if (apiError.code && apiError.code >= 400 && apiError.code < 500) {
    throw new ValidationError('Invalid request to Google API');
  }

  throw new SheetsError(
    'An unexpected error occurred while communicating with Google APIs',
    'UNKNOWN_ERROR',
    apiError.code || 500
  );
}

export function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error;
  }

  if (error instanceof AuthenticationError) {
    return new McpError(ErrorCode.InvalidRequest, error.message);
  }

  if (error instanceof ValidationError) {
    return new McpError(ErrorCode.InvalidParams, error.message);
  }

  if (error instanceof NotFoundError) {
    return new McpError(ErrorCode.InvalidParams, error.message);
  }

  if (error instanceof RateLimitError) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  if (error instanceof SheetsError) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  return new McpError(ErrorCode.InternalError, 'An unknown error occurred');
}