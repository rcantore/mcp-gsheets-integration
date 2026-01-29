/**
 * Mock implementation for @modelcontextprotocol/sdk
 */

export class McpError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'McpError';
  }
}

export const ErrorCode = {
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
};

export const ListToolsRequestSchema = 'tools/list';
export const CallToolRequestSchema = 'tools/call';
export const ListResourcesRequestSchema = 'resources/list';
export const ReadResourceRequestSchema = 'resources/read';
export const ListPromptsRequestSchema = 'prompts/list';
export const GetPromptRequestSchema = 'prompts/get';
