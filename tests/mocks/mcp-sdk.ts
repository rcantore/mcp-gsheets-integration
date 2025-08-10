/**
 * Mock implementation for @modelcontextprotocol/sdk
 */

export class McpError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'McpError';
  }
}

export const ErrorCode = {
  InvalidRequest: 'INVALID_REQUEST',
  MethodNotFound: 'METHOD_NOT_FOUND',
  InvalidParams: 'INVALID_PARAMS',
  InternalError: 'INTERNAL_ERROR',
};