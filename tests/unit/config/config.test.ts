/**
 * Unit tests for config validation
 */

// Mock dotenv to prevent it from loading .env file
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'error';
    // Remove any values dotenv may have loaded previously
    delete process.env['PORT'];
    delete process.env['MCP_SERVER_NAME'];
    delete process.env['MCP_SERVER_VERSION'];
    delete process.env['GOOGLE_REDIRECT_URI'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load valid config', async () => {
    process.env['GOOGLE_CLIENT_ID'] = 'test-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'test-secret';
    const { config } = await import('../../../src/config/index.js');
    expect(config.googleClientId).toBe('test-id');
    expect(config.googleClientSecret).toBe('test-secret');
  });

  it('should use defaults for optional values', async () => {
    process.env['GOOGLE_CLIENT_ID'] = 'test-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'test-secret';
    const { config } = await import('../../../src/config/index.js');
    expect(config.port).toBe(3000);
    expect(config.mcpServerName).toBe('gsheets-server');
  });

  it('should throw for missing required fields', async () => {
    delete process.env['GOOGLE_CLIENT_ID'];
    delete process.env['GOOGLE_CLIENT_SECRET'];
    await expect(import('../../../src/config/index.js')).rejects.toThrow('Configuration validation failed');
  });

  it('should parse PORT as number', async () => {
    process.env['GOOGLE_CLIENT_ID'] = 'test-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'test-secret';
    process.env['PORT'] = '8080';
    const { config } = await import('../../../src/config/index.js');
    expect(config.port).toBe(8080);
  });
});
