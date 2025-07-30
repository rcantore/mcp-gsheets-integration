[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/rcantore-mcp-gsheets-integration-badge.png)](https://mseep.ai/app/rcantore-mcp-gsheets-integration)

# MCP Google Sheets Server

A Model Context Protocol (MCP) server that provides AI agents with comprehensive Google Sheets integration capabilities. This server enables AI assistants like Claude to read, create, update, and manage Google Sheets through the Google Sheets API and Google Drive API.

## Security Warning

**IMPORTANT**: This server requires access to your Google Drive and Google Sheets data. By using this server, you are granting the connected AI assistant the ability to:

- Read all your Google Sheets files
- Access file metadata and sharing permissions
- Create new Google Sheets documents
- Modify existing sheet content
- Delete Google Sheets files

**Recommendations:**
- Only use this server in trusted environments
- Review the OAuth2 permissions carefully before authorizing
- Consider using a dedicated Google account for testing
- Monitor the server's access logs and activities
- Revoke access tokens when no longer needed

## Features

- **Find Sheets**: Search for Google Sheets in Google Drive by name or metadata
- **Read Data**: Retrieve data from specific ranges in Google Sheets
- **Create Sheets**: Generate new Google Sheets with custom configurations
- **Update Data**: Modify cell values and ranges in existing sheets
- **Delete Sheets**: Remove Google Sheets from Google Drive
- **OAuth2 Authentication**: Secure user authentication flow
- **Token Management**: Automatic token refresh and persistent storage

## Prerequisites

- Node.js 20 or higher
- Google Cloud Project with APIs enabled:
  - Google Sheets API v4
  - Google Drive API v3
- OAuth2 client credentials (Client ID and Client Secret)

## Google Cloud Setup

1. Create or select a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the required APIs:
   - Navigate to "APIs & Services" > "Library"
   - Search for and enable "Google Sheets API"
   - Search for and enable "Google Drive API"
3. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Desktop application"
   - Add `http://localhost:3000/oauth/callback` to authorized redirect URIs
   - Download the credentials JSON or note the Client ID and Client Secret

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/rcantore/mcp-gsheets-integration.git
cd mcp-gsheets-integration

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
MCP_SERVER_NAME=gsheets-server
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info
NODE_ENV=production
```

## Usage with Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gsheets": {
      "command": "/path/to/node",
      "args": ["/path/to/mcp-gsheets-integration/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Replace `/path/to/node` with your Node.js installation path (find with `which node` on macOS/Linux or `where node` on Windows).

## Authentication Flow

On first use, the server will:

1. Start a local OAuth2 callback server on port 3000
2. Generate an authorization URL
3. Display the URL in the server logs
4. Wait for you to authorize the application in your browser
5. Store the access and refresh tokens locally in `.oauth-tokens.json`
6. Automatically refresh tokens as needed for subsequent requests

## Available Tools

### find_sheets
Search for Google Sheets in Google Drive.

**Parameters:**
- `query` (optional): Search term to filter sheets by name
- `maxResults` (optional): Maximum number of results (default: 10)
- `orderBy` (optional): Sort order - 'name', 'createdTime', or 'modifiedTime' (default: 'modifiedTime')

### get_sheet_data
Retrieve data from a Google Sheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (optional): Cell range (e.g., "A1:C10")

### create_sheet
Create a new Google Sheet.

**Parameters:**
- `title` (required): Sheet title
- `sheets` (optional): Array of sheet tabs to create

### update_sheet
Update data in a Google Sheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (required): Cell range to update
- `values` (required): 2D array of cell values
- `majorDimension` (optional): 'ROWS' or 'COLUMNS'

### delete_sheet
Delete a Google Sheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID to delete

## Development

```bash
# Development mode with file watching
npm run watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## Testing

You can test the server before integrating with Claude Desktop using the MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Test your server
mcp-inspector node dist/index.js
```

## Troubleshooting

### Authentication Issues
- Verify your OAuth2 credentials are correct
- Check that redirect URI matches exactly: `http://localhost:3000/oauth/callback`
- Ensure required APIs are enabled in Google Cloud Console
- Try deleting `.oauth-tokens.json` to force re-authentication

### Connection Issues
- Verify Node.js path is correct in Claude Desktop configuration
- Check that the built server exists at `dist/index.js`
- Review server logs for detailed error messages
- Ensure port 3000 is available for OAuth callback

### Permission Errors
- Confirm the Google account has access to the sheets you're trying to access
- Check that the OAuth2 consent screen is properly configured
- Verify API keys have not been restricted to specific IPs or domains

## Architecture

- **TypeScript**: Full type safety with strict compiler settings
- **Google APIs**: Official googleapis client library
- **MCP SDK**: Official Model Context Protocol implementation
- **OAuth2**: Secure user authentication with automatic token refresh
- **Error Handling**: Comprehensive error handling with custom error types
- **Logging**: Structured logging with configurable levels

## Security Considerations

- OAuth2 tokens are stored locally in `.oauth-tokens.json`
- All API requests use HTTPS
- No credentials are logged or exposed in error messages
- Token refresh is handled automatically
- Server only accepts connections via MCP protocol (no HTTP endpoints)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to submit pull requests, report issues, and contribute to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- OAuth2 authentication support
- Full CRUD operations for Google Sheets
- MCP protocol integration
- Automatic token management