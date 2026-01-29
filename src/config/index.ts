import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  googleClientId: z.string(),
  googleClientSecret: z.string(),
  googleRedirectUri: z.string().default('http://localhost:3000/oauth/callback'),
  port: z.coerce.number().default(3000),
  mcpServerName: z.string().default('gsheets-server'),
  mcpServerVersion: z.string().default('1.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    googleClientId: process.env['GOOGLE_CLIENT_ID'],
    googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    googleRedirectUri: process.env['GOOGLE_REDIRECT_URI'],
    port: process.env['PORT'],
    mcpServerName: process.env['MCP_SERVER_NAME'],
    mcpServerVersion: process.env['MCP_SERVER_VERSION'],
    logLevel: process.env['LOG_LEVEL'],
    nodeEnv: process.env['NODE_ENV'],
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Configuration validation failed. Missing or invalid fields: ${missingFields}`);
    }
    throw error;
  }
}

export const config = loadConfig();