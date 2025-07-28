#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpSheetsServer } from './controllers/mcp-server.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

async function main(): Promise<void> {
  try {
    logger.info('Starting MCP Google Sheets server', {
      serverName: config.mcpServerName,
      version: config.mcpServerVersion,
      nodeEnv: config.nodeEnv,
    });

    const mcpServer = new McpSheetsServer();
    const server = mcpServer.getServer();
    
    const transport = new StdioServerTransport();
    
    server.onerror = (error) => {
      logger.error('MCP server error', { error });
    };

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await server.close();
      process.exit(0);
    });

    await server.connect(transport);
    logger.info('MCP server connected and ready to handle requests');

  } catch (error) {
    logger.error('Failed to start MCP server', { error });
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', { error });
    process.exit(1);
  });
}