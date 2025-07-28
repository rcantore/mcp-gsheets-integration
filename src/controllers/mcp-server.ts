import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
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
} from '../types/sheets.js';

export class McpSheetsServer {
  private server: Server;
  private sheetsService: GoogleSheetsService;

  constructor() {
    this.server = new Server({
      name: config.mcpServerName,
      version: config.mcpServerVersion,
    });

    this.sheetsService = new GoogleSheetsService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'find_sheets',
            description: 'Search for Google Sheets in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to filter sheets by name',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
                orderBy: {
                  type: 'string',
                  enum: ['name', 'createdTime', 'modifiedTime'],
                  description: 'Field to order results by',
                  default: 'modifiedTime',
                },
              },
            },
          },
          {
            name: 'get_sheet_data',
            description: 'Retrieve data from a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: {
                  type: 'string',
                  description: 'The ID of the Google Sheet',
                },
                range: {
                  type: 'string',
                  description: 'The range to read (e.g., A1:C10). If not specified, reads a default range',
                },
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
                title: {
                  type: 'string',
                  description: 'The title of the new sheet',
                },
                sheets: {
                  type: 'array',
                  description: 'Array of sheet tabs to create',
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
                sheetId: {
                  type: 'string',
                  description: 'The ID of the Google Sheet',
                },
                range: {
                  type: 'string',
                  description: 'The range to update (e.g., A1:C10)',
                },
                values: {
                  type: 'array',
                  description: 'Array of rows, where each row is an array of cell values',
                  items: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                majorDimension: {
                  type: 'string',
                  enum: ['ROWS', 'COLUMNS'],
                  description: 'Whether values represent rows or columns',
                  default: 'ROWS',
                },
              },
              required: ['sheetId', 'range', 'values'],
            },
          },
          {
            name: 'delete_sheet',
            description: 'Delete a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                sheetId: {
                  type: 'string',
                  description: 'The ID of the Google Sheet to delete',
                },
              },
              required: ['sheetId'],
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
            const validatedArgs = FindSheetsRequestSchema.parse(args);
            const sheets = await this.sheetsService.findSheets(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(sheets, null, 2),
                },
              ],
            };
          }

          case 'get_sheet_data': {
            const { sheetId, range } = args as { sheetId: string; range?: string };
            const data = await this.sheetsService.getSheetData(sheetId, range);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'create_sheet': {
            const validatedArgs = CreateSheetRequestSchema.parse(args);
            const metadata = await this.sheetsService.createSheet(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(metadata, null, 2),
                },
              ],
            };
          }

          case 'update_sheet': {
            const validatedArgs = UpdateSheetRequestSchema.parse(args);
            await this.sheetsService.updateSheet(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, message: 'Sheet updated successfully' }),
                },
              ],
            };
          }

          case 'delete_sheet': {
            const { sheetId } = args as { sheetId: string };
            await this.sheetsService.deleteSheet(sheetId);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, message: 'Sheet deleted successfully' }),
                },
              ],
            };
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

  async start(): Promise<void> {
    const transport = {
      start: async () => {
        logger.info(`MCP server ${config.mcpServerName} v${config.mcpServerVersion} started`);
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.server.connect(transport as any);
  }

  getServer(): Server {
    return this.server;
  }
}