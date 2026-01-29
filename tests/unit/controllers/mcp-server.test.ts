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
  ListResourcesRequestSchema: 'resources/list',
  ReadResourceRequestSchema: 'resources/read',
  ListPromptsRequestSchema: 'prompts/list',
  GetPromptRequestSchema: 'prompts/get',
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
      appendValues: jest.fn(),
      clearRange: jest.fn(),
      batchGet: jest.fn(),
      batchUpdate: jest.fn(),
      getSpreadsheetInfo: jest.fn(),
      addSheetTab: jest.fn(),
      deleteSheetTab: jest.fn(),
      renameSheetTab: jest.fn(),
    } as any;

    MockedGoogleSheetsService.mockImplementation(() => mockSheetsService);

    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      _requestHandlers: new Map(),
    };

    const { Server } = jest.requireMock('@modelcontextprotocol/sdk/server/index.js');
    Server.mockImplementation(() => mockServer);

    mcpServer = new McpSheetsServer();
  });

  describe('constructor', () => {
    it('should initialize server and setup handlers', () => {
      // tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(6);
      expect(MockedGoogleSheetsService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getServer', () => {
    it('should return the server instance', () => {
      const server = mcpServer.getServer();
      expect(server).toBe(mockServer);
    });
  });

  describe('tool listing', () => {
    it('should list all 13 tools', async () => {
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = await listToolsHandler({});

      expect(result.tools).toHaveLength(13);
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toEqual([
        'find_sheets', 'get_sheet_data', 'create_sheet', 'update_sheet', 'delete_sheet',
        'append_values', 'clear_range', 'batch_get', 'batch_update',
        'get_spreadsheet_info', 'add_sheet_tab', 'delete_sheet_tab', 'rename_sheet_tab',
      ]);
    });

    it('should include valueInputOption in update_sheet schema', async () => {
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = await listToolsHandler({});
      const updateTool = result.tools.find((t: any) => t.name === 'update_sheet');
      expect(updateTool.inputSchema.properties).toHaveProperty('valueInputOption');
    });
  });

  describe('CallTool handler', () => {
    let callToolHandler: any;

    beforeEach(() => {
      callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
    });

    it('should dispatch find_sheets', async () => {
      mockSheetsService.findSheets.mockResolvedValue([{ id: '1', name: 'Test', url: '', createdTime: '', modifiedTime: '' }]);
      const result = await callToolHandler({ params: { name: 'find_sheets', arguments: { maxResults: 5 } } });
      expect(mockSheetsService.findSheets).toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');
    });

    it('should dispatch get_sheet_data with Zod validation', async () => {
      mockSheetsService.getSheetData.mockResolvedValue({ sheetId: 'x', values: [] });
      const result = await callToolHandler({ params: { name: 'get_sheet_data', arguments: { sheetId: 'abc', range: 'A1:B2' } } });
      expect(mockSheetsService.getSheetData).toHaveBeenCalledWith('abc', 'A1:B2');
      expect(result.content[0].type).toBe('text');
    });

    it('should reject get_sheet_data with empty sheetId', async () => {
      await expect(callToolHandler({ params: { name: 'get_sheet_data', arguments: { sheetId: '' } } })).rejects.toThrow();
    });

    it('should dispatch create_sheet', async () => {
      mockSheetsService.createSheet.mockResolvedValue({ id: '1', name: 'New', url: '', createdTime: '', modifiedTime: '' });
      await callToolHandler({ params: { name: 'create_sheet', arguments: { title: 'New Sheet' } } });
      expect(mockSheetsService.createSheet).toHaveBeenCalled();
    });

    it('should dispatch update_sheet with valueInputOption', async () => {
      mockSheetsService.updateSheet.mockResolvedValue(undefined);
      await callToolHandler({
        params: {
          name: 'update_sheet',
          arguments: { sheetId: 'x', range: 'A1', values: [['1']], valueInputOption: 'USER_ENTERED' }
        }
      });
      expect(mockSheetsService.updateSheet).toHaveBeenCalledWith(
        expect.objectContaining({ valueInputOption: 'USER_ENTERED' })
      );
    });

    it('should dispatch delete_sheet with Zod validation', async () => {
      mockSheetsService.deleteSheet.mockResolvedValue(undefined);
      const result = await callToolHandler({ params: { name: 'delete_sheet', arguments: { sheetId: 'abc' } } });
      expect(mockSheetsService.deleteSheet).toHaveBeenCalledWith('abc');
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true, message: 'Sheet moved to trash' });
    });

    it('should reject delete_sheet with empty sheetId', async () => {
      await expect(callToolHandler({ params: { name: 'delete_sheet', arguments: { sheetId: '' } } })).rejects.toThrow();
    });

    it('should dispatch append_values', async () => {
      mockSheetsService.appendValues.mockResolvedValue(undefined);
      await callToolHandler({
        params: { name: 'append_values', arguments: { sheetId: 'x', range: 'A:A', values: [['row1']] } }
      });
      expect(mockSheetsService.appendValues).toHaveBeenCalled();
    });

    it('should dispatch clear_range', async () => {
      mockSheetsService.clearRange.mockResolvedValue(undefined);
      await callToolHandler({
        params: { name: 'clear_range', arguments: { sheetId: 'x', range: 'A1:B2' } }
      });
      expect(mockSheetsService.clearRange).toHaveBeenCalledWith('x', 'A1:B2');
    });

    it('should dispatch batch_get', async () => {
      mockSheetsService.batchGet.mockResolvedValue({ 'A1:B2': [['a']] });
      await callToolHandler({
        params: { name: 'batch_get', arguments: { sheetId: 'x', ranges: ['A1:B2'] } }
      });
      expect(mockSheetsService.batchGet).toHaveBeenCalledWith('x', ['A1:B2']);
    });

    it('should dispatch batch_update', async () => {
      mockSheetsService.batchUpdate.mockResolvedValue(undefined);
      await callToolHandler({
        params: {
          name: 'batch_update',
          arguments: { sheetId: 'x', data: [{ range: 'A1', values: [['v']] }] }
        }
      });
      expect(mockSheetsService.batchUpdate).toHaveBeenCalled();
    });

    it('should dispatch get_spreadsheet_info', async () => {
      mockSheetsService.getSpreadsheetInfo.mockResolvedValue({ spreadsheetId: 'x', title: 'T' });
      await callToolHandler({
        params: { name: 'get_spreadsheet_info', arguments: { sheetId: 'x' } }
      });
      expect(mockSheetsService.getSpreadsheetInfo).toHaveBeenCalledWith('x');
    });

    it('should dispatch add_sheet_tab', async () => {
      mockSheetsService.addSheetTab.mockResolvedValue({ sheetId: 1, title: 'Tab' });
      const result = await callToolHandler({
        params: { name: 'add_sheet_tab', arguments: { sheetId: 'x', title: 'Tab' } }
      });
      expect(mockSheetsService.addSheetTab).toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.title).toBe('Tab');
    });

    it('should dispatch delete_sheet_tab', async () => {
      mockSheetsService.deleteSheetTab.mockResolvedValue(undefined);
      await callToolHandler({
        params: { name: 'delete_sheet_tab', arguments: { sheetId: 'x', tabId: 0 } }
      });
      expect(mockSheetsService.deleteSheetTab).toHaveBeenCalledWith('x', 0);
    });

    it('should dispatch rename_sheet_tab', async () => {
      mockSheetsService.renameSheetTab.mockResolvedValue(undefined);
      await callToolHandler({
        params: { name: 'rename_sheet_tab', arguments: { sheetId: 'x', tabId: 0, newTitle: 'Renamed' } }
      });
      expect(mockSheetsService.renameSheetTab).toHaveBeenCalledWith('x', 0, 'Renamed');
    });

    it('should throw for unknown tool', async () => {
      await expect(
        callToolHandler({ params: { name: 'nonexistent_tool', arguments: {} } })
      ).rejects.toThrow();
    });

    it('should throw for invalid validation args', async () => {
      await expect(
        callToolHandler({ params: { name: 'batch_get', arguments: { sheetId: 'x', ranges: [] } } })
      ).rejects.toThrow();
    });
  });

  describe('resource handlers', () => {
    it('should list resources (empty)', async () => {
      const listResourcesHandler = mockServer.setRequestHandler.mock.calls[2][1];
      const result = await listResourcesHandler({});
      expect(result.resources).toEqual([]);
    });

    it('should read a sheet resource', async () => {
      mockSheetsService.getSheetData.mockResolvedValue({ sheetId: 'abc', values: [['data']] });
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[3][1];
      const result = await readResourceHandler({ params: { uri: 'sheet://abc' } });
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(mockSheetsService.getSheetData).toHaveBeenCalledWith('abc');
    });

    it('should reject invalid resource URI', async () => {
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[3][1];
      await expect(readResourceHandler({ params: { uri: 'invalid://x' } })).rejects.toThrow();
    });
  });

  describe('prompt handlers', () => {
    it('should list prompts', async () => {
      const listPromptsHandler = mockServer.setRequestHandler.mock.calls[4][1];
      const result = await listPromptsHandler({});
      expect(result.prompts).toHaveLength(2);
      expect(result.prompts[0].name).toBe('analyze_sheet_data');
      expect(result.prompts[1].name).toBe('create_report_template');
    });

    it('should get analyze_sheet_data prompt', async () => {
      const getPromptHandler = mockServer.setRequestHandler.mock.calls[5][1];
      const result = await getPromptHandler({ params: { name: 'analyze_sheet_data', arguments: { sheetId: 'abc' } } });
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('abc');
    });

    it('should get create_report_template prompt', async () => {
      const getPromptHandler = mockServer.setRequestHandler.mock.calls[5][1];
      const result = await getPromptHandler({ params: { name: 'create_report_template', arguments: { title: 'Q1 Report' } } });
      expect(result.messages[0].content.text).toContain('Q1 Report');
    });

    it('should throw for unknown prompt', async () => {
      const getPromptHandler = mockServer.setRequestHandler.mock.calls[5][1];
      await expect(getPromptHandler({ params: { name: 'nonexistent', arguments: {} } })).rejects.toThrow();
    });
  });
});
