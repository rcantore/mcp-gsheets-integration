import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleSheetsService } from '../services/sheets.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { toMcpError } from '../utils/errors.js';
import {
  CreateSheetRequestSchema,
  UpdateSheetRequestSchema,
  FindSheetsRequestSchema,
  GetSheetDataRequestSchema,
  DeleteSheetRequestSchema,
  AppendValuesRequestSchema,
  ClearRangeRequestSchema,
  BatchGetRequestSchema,
  BatchUpdateRequestSchema,
  GetSpreadsheetInfoRequestSchema,
  AddSheetTabRequestSchema,
  DeleteSheetTabRequestSchema,
  RenameSheetTabRequestSchema,
} from '../types/sheets.js';

function formatToolResponse(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

export class McpSheetsServer {
  private server: Server;
  private sheetsService: GoogleSheetsService;

  constructor(sheetsService?: GoogleSheetsService) {
    this.server = new Server({
      name: config.mcpServerName,
      version: config.mcpServerVersion,
    });

    this.sheetsService = sheetsService ?? new GoogleSheetsService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'find_sheets',
            description: 'Search for Google Sheets in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query to filter sheets by name' },
                maxResults: { type: 'number', description: 'Maximum results (1-100)', default: 10 },
                orderBy: { type: 'string', enum: ['name', 'createdTime', 'modifiedTime'], description: 'Sort field', default: 'modifiedTime' },
              },
            },
          },
          {
            name: 'get_sheet_data',
            description: 'Retrieve data from a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                range: { type: 'string', description: 'The range to read (e.g., A1:C10). Defaults to A1:Z1000' },
              },
              required: ['sheetId'],
            },
          },
          {
            name: 'create_sheet',
            description: 'Create a new Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'The title of the new sheet' },
                sheets: {
                  type: 'array', description: 'Sheet tabs to create',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      rowCount: { type: 'number', default: 1000 },
                      columnCount: { type: 'number', default: 26 },
                    },
                    required: ['name'],
                  },
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'update_sheet',
            description: 'Update data in a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                range: { type: 'string', description: 'The range to update (e.g., A1:C10)' },
                values: { type: 'array', description: 'Array of rows', items: { type: 'array', items: { type: 'string' } } },
                majorDimension: { type: 'string', enum: ['ROWS', 'COLUMNS'], default: 'ROWS' },
                valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], description: 'How to interpret input. USER_ENTERED parses formulas.', default: 'RAW' },
              },
              required: ['sheetId', 'range', 'values'],
            },
          },
          {
            name: 'delete_sheet',
            description: 'Move a Google Sheet to trash (recoverable)',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet to trash' },
              },
              required: ['sheetId'],
            },
          },
          {
            name: 'append_values',
            description: 'Append rows to a Google Sheet without needing to know the last row',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                range: { type: 'string', description: 'Target range (e.g., Sheet1!A:A)' },
                values: { type: 'array', description: 'Array of rows to append', items: { type: 'array', items: { type: 'string' } } },
                valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], default: 'RAW' },
              },
              required: ['sheetId', 'range', 'values'],
            },
          },
          {
            name: 'clear_range',
            description: 'Clear cell contents in a range without deleting the sheet structure',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                range: { type: 'string', description: 'Range to clear (e.g., A1:C10)' },
              },
              required: ['sheetId', 'range'],
            },
          },
          {
            name: 'batch_get',
            description: 'Read multiple ranges from a Google Sheet in a single API call',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                ranges: { type: 'array', description: 'Array of ranges to read', items: { type: 'string' } },
              },
              required: ['sheetId', 'ranges'],
            },
          },
          {
            name: 'batch_update',
            description: 'Write to multiple ranges in a Google Sheet in a single API call',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                data: {
                  type: 'array', description: 'Array of range/values pairs',
                  items: {
                    type: 'object',
                    properties: {
                      range: { type: 'string' },
                      values: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                    },
                    required: ['range', 'values'],
                  },
                },
                valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], default: 'RAW' },
              },
              required: ['sheetId', 'data'],
            },
          },
          {
            name: 'get_spreadsheet_info',
            description: 'Get full spreadsheet metadata: tabs, properties, named ranges',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
              },
              required: ['sheetId'],
            },
          },
          {
            name: 'add_sheet_tab',
            description: 'Add a new tab to an existing spreadsheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                title: { type: 'string', description: 'Title of the new tab' },
                rowCount: { type: 'number', description: 'Number of rows' },
                columnCount: { type: 'number', description: 'Number of columns' },
              },
              required: ['sheetId', 'title'],
            },
          },
          {
            name: 'delete_sheet_tab',
            description: 'Delete a tab from a spreadsheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                tabId: { type: 'number', description: 'Numeric ID of the tab within the spreadsheet' },
              },
              required: ['sheetId', 'tabId'],
            },
          },
          {
            name: 'rename_sheet_tab',
            description: 'Rename a tab in a spreadsheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', description: 'The ID of the Google Sheet' },
                tabId: { type: 'number', description: 'Numeric ID of the tab' },
                newTitle: { type: 'string', description: 'New title for the tab' },
              },
              required: ['sheetId', 'tabId', 'newTitle'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'find_sheets': {
            const validated = FindSheetsRequestSchema.parse(args);
            const sheets = await this.sheetsService.findSheets(validated);
            return formatToolResponse(sheets);
          }

          case 'get_sheet_data': {
            const validated = GetSheetDataRequestSchema.parse(args);
            const data = await this.sheetsService.getSheetData(validated.sheetId, validated.range);
            return formatToolResponse(data);
          }

          case 'create_sheet': {
            const validated = CreateSheetRequestSchema.parse(args);
            const metadata = await this.sheetsService.createSheet(validated);
            return formatToolResponse(metadata);
          }

          case 'update_sheet': {
            const validated = UpdateSheetRequestSchema.parse(args);
            await this.sheetsService.updateSheet(validated);
            return formatToolResponse({ success: true, message: 'Sheet updated successfully' });
          }

          case 'delete_sheet': {
            const validated = DeleteSheetRequestSchema.parse(args);
            await this.sheetsService.deleteSheet(validated.sheetId);
            return formatToolResponse({ success: true, message: 'Sheet moved to trash' });
          }

          case 'append_values': {
            const validated = AppendValuesRequestSchema.parse(args);
            await this.sheetsService.appendValues(validated);
            return formatToolResponse({ success: true, message: 'Values appended successfully' });
          }

          case 'clear_range': {
            const validated = ClearRangeRequestSchema.parse(args);
            await this.sheetsService.clearRange(validated.sheetId, validated.range);
            return formatToolResponse({ success: true, message: 'Range cleared successfully' });
          }

          case 'batch_get': {
            const validated = BatchGetRequestSchema.parse(args);
            const data = await this.sheetsService.batchGet(validated.sheetId, validated.ranges);
            return formatToolResponse(data);
          }

          case 'batch_update': {
            const validated = BatchUpdateRequestSchema.parse(args);
            await this.sheetsService.batchUpdate(validated);
            return formatToolResponse({ success: true, message: 'Batch update completed' });
          }

          case 'get_spreadsheet_info': {
            const validated = GetSpreadsheetInfoRequestSchema.parse(args);
            const info = await this.sheetsService.getSpreadsheetInfo(validated.sheetId);
            return formatToolResponse(info);
          }

          case 'add_sheet_tab': {
            const validated = AddSheetTabRequestSchema.parse(args);
            const result = await this.sheetsService.addSheetTab(validated);
            return formatToolResponse({ success: true, ...result });
          }

          case 'delete_sheet_tab': {
            const validated = DeleteSheetTabRequestSchema.parse(args);
            await this.sheetsService.deleteSheetTab(validated.sheetId, validated.tabId);
            return formatToolResponse({ success: true, message: 'Sheet tab deleted' });
          }

          case 'rename_sheet_tab': {
            const validated = RenameSheetTabRequestSchema.parse(args);
            await this.sheetsService.renameSheetTab(validated.sheetId, validated.tabId, validated.newTitle);
            return formatToolResponse({ success: true, message: 'Sheet tab renamed' });
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, { error, args });
        throw toMcpError(error);
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^sheet:\/\/(.+)$/);
      if (!match?.[1]) {
        throw new McpError(ErrorCode.InvalidRequest, `Invalid resource URI: ${uri}`);
      }

      const sheetId = match[1];
      try {
        const data = await this.sheetsService.getSheetData(sheetId);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Failed to read resource', { error, uri });
        throw toMcpError(error);
      }
    });
  }

  private setupPromptHandlers(): void {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'analyze_sheet_data',
            description: 'Analyze data in a Google Sheet and provide insights',
            arguments: [
              { name: 'sheetId', description: 'The Google Sheet ID', required: true },
              { name: 'range', description: 'Range to analyze (e.g., A1:Z100)', required: false },
            ],
          },
          {
            name: 'create_report_template',
            description: 'Create a structured report template in a Google Sheet',
            arguments: [
              { name: 'title', description: 'Report title', required: true },
              { name: 'sections', description: 'Comma-separated list of report sections', required: false },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: promptArgs } = request.params;

      switch (name) {
        case 'analyze_sheet_data': {
          const sheetId = promptArgs?.['sheetId'] ?? '';
          const range = promptArgs?.['range'] ?? 'A1:Z100';
          return {
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Please analyze the data in Google Sheet "${sheetId}" (range: ${range}). First use the get_sheet_data tool to retrieve the data, then provide:\n1. A summary of the data structure (columns, row count)\n2. Key statistics or patterns\n3. Any data quality issues\n4. Actionable insights`,
                },
              },
            ],
          };
        }

        case 'create_report_template': {
          const title = promptArgs?.['title'] ?? 'Report';
          const sections = promptArgs?.['sections'] ?? 'Summary,Data,Analysis,Conclusions';
          return {
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Create a new Google Sheet titled "${title}" with the following report sections as tabs: ${sections}. Use the create_sheet tool, then use update_sheet to add headers and structure to each tab.`,
                },
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
      }
    });
  }

  getServer(): Server {
    return this.server;
  }
}
