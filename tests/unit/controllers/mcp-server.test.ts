import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { McpSheetsServer } from '../../../src/controllers/mcp-server.js';
import { GoogleSheetsService } from '../../../src/services/sheets.js';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    _requestHandlers: new Map(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ErrorCode: {
    MethodNotFound: -32601,
    InvalidRequest: -32600,
    InvalidParams: -32602,
    InternalError: -32603,
  },
  McpError: jest.fn().mockImplementation(function(code: number, message: string) {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  }),
  ListToolsRequestSchema: 'tools/list',
  CallToolRequestSchema: 'tools/call',
}));

// Mock the GoogleSheetsService
jest.mock('../../../src/services/sheets.js');
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/config/index.js', () => ({
  config: {
    mcpServerName: 'test-server',
    mcpServerVersion: '1.0.0',
  },
}));

const MockedGoogleSheetsService = GoogleSheetsService as jest.MockedClass<typeof GoogleSheetsService>;

describe('McpSheetsServer', () => {
  let mcpServer: McpSheetsServer;
  let mockSheetsService: jest.Mocked<GoogleSheetsService>;
  let mockServer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSheetsService = {
      findSheets: jest.fn(),
      getSheetData: jest.fn(),
      createSheet: jest.fn(),
      updateSheet: jest.fn(),
      deleteSheet: jest.fn(),
    } as any;

    MockedGoogleSheetsService.mockImplementation(() => mockSheetsService);
    
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      _requestHandlers: new Map(),
    };

    // Update the Server mock to return our mockServer
    const { Server } = jest.requireMock('@modelcontextprotocol/sdk/server/index.js');
    Server.mockImplementation(() => mockServer);
    
    mcpServer = new McpSheetsServer();
  });

  describe('constructor', () => {
    it('should initialize server and setup handlers', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(MockedGoogleSheetsService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getServer', () => {
    it('should return the server instance', () => {
      const server = mcpServer.getServer();
      expect(server).toBe(mockServer);
    });
  });

  describe('tool configuration', () => {
    it('should setup handlers for list and call tools', () => {
      // Verify that setRequestHandler was called with correct schemas
      const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;
      
      expect(setRequestHandlerCalls).toHaveLength(2);
      expect(setRequestHandlerCalls[0][0]).toBe('tools/list');
      expect(setRequestHandlerCalls[1][0]).toBe('tools/call');
    });

    it('should provide proper tool definitions', async () => {
      // Get the list tools handler
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = await listToolsHandler({});
      
      expect(result.tools).toHaveLength(5);
      expect(result.tools.map((t: any) => t.name)).toEqual([
        'find_sheets',
        'get_sheet_data', 
        'create_sheet',
        'update_sheet',
        'delete_sheet'
      ]);
      
      // Verify schemas have required properties
      const findSheetsSchema = result.tools.find((t: any) => t.name === 'find_sheets');
      expect(findSheetsSchema.inputSchema.properties).toHaveProperty('query');
      expect(findSheetsSchema.inputSchema.properties).toHaveProperty('maxResults');
      
      const getSheetDataSchema = result.tools.find((t: any) => t.name === 'get_sheet_data');
      expect(getSheetDataSchema.inputSchema.required).toContain('sheetId');
    });
  });
});