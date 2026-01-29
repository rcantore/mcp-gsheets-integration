import {
  handleGoogleApiError,
  toMcpError,
  SheetsError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from '../../../src/utils/errors.js';

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/config/index.js', () => ({
  config: { logLevel: 'error' },
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ErrorCode: {
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
  },
  McpError: jest.fn().mockImplementation(function(this: any, code: number, message: string) {
    this.code = code;
    this.message = message;
    this.name = 'McpError';
    return this;
  }),
}));

describe('handleGoogleApiError', () => {
  it('should throw AuthenticationError for 401', () => {
    expect(() => handleGoogleApiError({ code: 401 })).toThrow(AuthenticationError);
  });

  it('should throw AuthenticationError for 403', () => {
    expect(() => handleGoogleApiError({ code: 403 })).toThrow(AuthenticationError);
  });

  it('should throw NotFoundError for 404', () => {
    expect(() => handleGoogleApiError({ code: 404 })).toThrow(NotFoundError);
  });

  it('should throw RateLimitError for 429', () => {
    expect(() => handleGoogleApiError({ code: 429 })).toThrow(RateLimitError);
  });

  it('should throw ValidationError for 4xx errors', () => {
    expect(() => handleGoogleApiError({ code: 400 })).toThrow(ValidationError);
    expect(() => handleGoogleApiError({ code: 422 })).toThrow(ValidationError);
  });

  it('should not leak API message for 4xx errors', () => {
    try {
      handleGoogleApiError({ code: 400, message: 'Sensitive API detail: invalid field xyz' });
    } catch (e: any) {
      expect(e.message).toBe('Invalid request to Google API');
      expect(e.message).not.toContain('Sensitive');
    }
  });

  it('should throw generic SheetsError for 5xx', () => {
    expect(() => handleGoogleApiError({ code: 500, message: 'Internal' })).toThrow(SheetsError);
  });

  it('should not leak API message for 5xx errors', () => {
    try {
      handleGoogleApiError({ code: 500, message: 'backend failure details' });
    } catch (e: any) {
      expect(e.message).toBe('An unexpected error occurred while communicating with Google APIs');
    }
  });

  it('should handle unknown error shape', () => {
    expect(() => handleGoogleApiError({})).toThrow(SheetsError);
  });
});

describe('toMcpError', () => {
  it('should pass through McpError', () => {
    const { McpError } = jest.requireMock('@modelcontextprotocol/sdk/types.js');
    const mcpError = new McpError(-32600, 'test');
    const result = toMcpError(mcpError);
    expect(result).toBe(mcpError);
  });

  it('should convert AuthenticationError', () => {
    const result = toMcpError(new AuthenticationError('auth failed'));
    expect(result).toBeDefined();
  });

  it('should convert ValidationError', () => {
    const result = toMcpError(new ValidationError('bad input'));
    expect(result).toBeDefined();
  });

  it('should convert NotFoundError', () => {
    const result = toMcpError(new NotFoundError('Sheet', 'abc'));
    expect(result).toBeDefined();
  });

  it('should convert RateLimitError', () => {
    const result = toMcpError(new RateLimitError());
    expect(result).toBeDefined();
  });

  it('should convert SheetsError', () => {
    const result = toMcpError(new SheetsError('test', 'CODE'));
    expect(result).toBeDefined();
  });

  it('should convert generic Error', () => {
    const result = toMcpError(new Error('generic'));
    expect(result).toBeDefined();
  });

  it('should handle non-Error values', () => {
    const result = toMcpError('string error');
    expect(result).toBeDefined();
  });
});
