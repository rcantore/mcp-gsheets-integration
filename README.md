[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/rcantore-mcp-gsheets-integration-badge.png)](https://mseep.ai/app/rcantore-mcp-gsheets-integration)

[![Verified on MSeeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/0144049d-2a02-435c-8f64-754951908ebc)

# MCP Google Sheets Server

A Model Context Protocol (MCP) server that provides AI agents with comprehensive Google Sheets integration capabilities. This server enables AI assistants like Claude to read, create, update, and manage Google Sheets through the Google Sheets API and Google Drive API.

## Security Warning

**IMPORTANT**: This server requires access to your Google Drive and Google Sheets data. By using this server, you are granting the connected AI assistant the ability to:

- Search for Google Sheets files you own or have access to
- Read sheet content and metadata
- Create new Google Sheets documents
- Modify existing sheet content
- Move Google Sheets to trash (not permanently deleted)

**Recommendations:**
- Only use this server in trusted environments
- Review the OAuth2 permissions carefully before authorizing
- Consider using a dedicated Google account for testing
- Monitor the server's access logs and activities
- Revoke access tokens when no longer needed

## Features

### 13 MCP Tools
- **Find Sheets**: Search for Google Sheets in Google Drive by name or metadata
- **Read Data**: Retrieve data from specific ranges in Google Sheets
- **Create Sheets**: Generate new Google Sheets with custom configurations
- **Update Data**: Modify cell values and ranges with formula support (`USER_ENTERED`)
- **Delete Sheets**: Move Google Sheets to trash (recoverable)
- **Append Values**: Add rows to a sheet without knowing the last row
- **Clear Range**: Clear cell contents without deleting structure
- **Batch Get**: Read multiple ranges in a single API call
- **Batch Update**: Write to multiple ranges in a single API call
- **Spreadsheet Info**: Get full metadata including all tabs and named ranges
- **Add/Delete/Rename Sheet Tabs**: Manage individual tabs within a spreadsheet

### MCP Resources & Prompts
- **Resources**: Sheets exposed as `sheet://{sheetId}` URIs for direct content inspection
- **Prompts**: Built-in templates for common workflows (`analyze_sheet_data`, `create_report_template`)

### Security & Authentication
- **OAuth2 with PKCE (S256)** and CSRF state validation
- **Secure token storage** at `~/.config/mcp-gsheets-server/` with restricted file permissions
- **Localhost-only** OAuth callback server
- **Minimal scopes**: `spreadsheets` + `drive.file` only
- **Input validation**: All tool inputs validated with Zod schemas
- **Automatic token refresh** and persistent storage

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
PORT=3000
MCP_SERVER_NAME=gsheets-server
MCP_SERVER_VERSION=1.2.0
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

1. Start a local OAuth2 callback server on `127.0.0.1:3000`
2. Generate an authorization URL with PKCE (S256) challenge and CSRF state parameter
3. Automatically open the URL in your default browser
4. If browser opening fails, display the URL in the server logs as fallback
5. Wait for you to authorize the application in your browser
6. Validate the CSRF state and exchange the authorization code with PKCE verification
7. Store tokens securely at `~/.config/mcp-gsheets-server/oauth-tokens.json` (permissions `0600`)
8. Automatically refresh tokens as needed for subsequent requests

## Available Tools

### find_sheets
Search for Google Sheets in Google Drive.

**Parameters:**
- `query` (optional): Search term to filter sheets by name
- `maxResults` (optional): Maximum number of results (1-100, default: 10)
- `orderBy` (optional): Sort order - `name`, `createdTime`, or `modifiedTime` (default: `modifiedTime`)

### get_sheet_data
Retrieve data from a Google Sheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (optional): Cell range (e.g., `A1:C10`, default: `A1:Z1000`)

### create_sheet
Create a new Google Sheet.

**Parameters:**
- `title` (required): Sheet title
- `sheets` (optional): Array of sheet tabs with optional `name`, `rowCount`, `columnCount`

### update_sheet
Update data in a Google Sheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (required): Cell range to update
- `values` (required): 2D array of cell values
- `majorDimension` (optional): `ROWS` or `COLUMNS`
- `valueInputOption` (optional): `RAW` or `USER_ENTERED` (default: `RAW`). Use `USER_ENTERED` for formulas.

### delete_sheet
Move a Google Sheet to trash.

**Parameters:**
- `sheetId` (required): The Google Sheet ID to trash

### append_values
Append rows to a sheet without knowing the last row.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (required): Target range (e.g., `Sheet1!A:A`)
- `values` (required): 2D array of row values
- `valueInputOption` (optional): `RAW` or `USER_ENTERED` (default: `RAW`)

### clear_range
Clear cell contents without deleting the sheet structure.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `range` (required): Range to clear (e.g., `A1:C10`)

### batch_get
Read multiple ranges in a single API call.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `ranges` (required): Array of range strings

### batch_update
Write to multiple ranges in a single API call.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `data` (required): Array of `{ range, values }` objects
- `valueInputOption` (optional): `RAW` or `USER_ENTERED` (default: `RAW`)

### get_spreadsheet_info
Get full spreadsheet metadata including all tabs and named ranges.

**Parameters:**
- `sheetId` (required): The Google Sheet ID

### add_sheet_tab
Add a new tab to an existing spreadsheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `title` (required): New tab title
- `rowCount` (optional): Number of rows (1-10000)
- `columnCount` (optional): Number of columns (1-702)

### delete_sheet_tab
Delete a tab from a spreadsheet.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `tabId` (required): Numeric tab ID (from `get_spreadsheet_info`)

### rename_sheet_tab
Rename an existing tab.

**Parameters:**
- `sheetId` (required): The Google Sheet ID
- `tabId` (required): Numeric tab ID
- `newTitle` (required): New tab title

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
- Try deleting `~/.config/mcp-gsheets-server/oauth-tokens.json` to force re-authentication

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
- **MCP SDK**: Official Model Context Protocol implementation (Tools, Resources, Prompts)
- **OAuth2 + PKCE**: Secure user authentication with S256 code challenge and CSRF state
- **Zod Validation**: All tool inputs validated with schemas and bounds
- **Error Handling**: Comprehensive error handling with sanitized messages
- **Logging**: Structured logging with configurable levels
- **esbuild**: Fast bundling for production

## Security Considerations

- OAuth2 tokens stored at `~/.config/mcp-gsheets-server/oauth-tokens.json` with `0600` permissions
- PKCE (S256) prevents authorization code interception
- CSRF state parameter prevents cross-site request forgery
- OAuth callback server binds to `127.0.0.1` only (not accessible from network)
- Minimal OAuth scopes: `spreadsheets` + `drive.file` (no broad Drive access)
- All API requests use HTTPS
- Error messages sanitized — no internal API details leaked
- Delete operations use trash (recoverable) instead of permanent deletion
- All tool inputs validated with Zod schemas including bounds
- Server only accepts connections via MCP protocol (no HTTP endpoints)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to submit pull requests, report issues, and contribute to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.
