# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-29

### Added

- **8 new MCP tools**: `append_values`, `clear_range`, `batch_get`, `batch_update`, `get_spreadsheet_info`, `add_sheet_tab`, `delete_sheet_tab`, `rename_sheet_tab`
- **MCP Resources**: Expose sheets as `sheet://{sheetId}` URIs for direct content inspection
- **MCP Prompts**: `analyze_sheet_data` and `create_report_template` prompt templates
- **`valueInputOption` support**: `RAW` or `USER_ENTERED` for formula-aware writes on `update_sheet`, `append_values`, and `batch_update`
- **Zod validation schemas** with min/max bounds for all tool inputs (new and existing)
- **PKCE (S256)** for OAuth authorization flow
- **CSRF state parameter** validation on OAuth callback
- **Secure token storage**: Tokens saved to `~/.config/mcp-gsheets-server/oauth-tokens.json` with `0o600` permissions
- **Drive API query escaping** to prevent injection in `find_sheets`
- **Comprehensive test suite**: 85 tests covering all 13 tools, OAuth server, error utilities, and config validation
- **OAuth server tests** with real HTTP server (PKCE, CSRF, error paths)
- **Error utility tests** for all Google API error codes and MCP error mapping
- **Config validation tests** with dotenv isolation

### Changed

- OAuth callback server binds to `127.0.0.1` instead of `0.0.0.0`
- OAuth scopes reduced: removed `drive.readonly`, using `drive.file` only
- `delete_sheet` now trashes files instead of permanently deleting them
- Error messages sanitized to avoid leaking internal API details
- Config validated with Zod schema at startup
- `formatToolResponse()` helper replaces duplicated response formatting
- Constructor dependency injection on `GoogleAuthService` and `OAuthServer` for testability

### Fixed

- OAuth flow no longer triggers the authorization screen twice
- `code_verifier` correctly sent during token exchange (fixes "Missing code verifier" error)
- OAuth server properly closes connections on all error/rejection paths
- Type compatibility with TypeScript `exactOptionalPropertyTypes`

## [1.1.1] - 2025-08-12

### Changed

- Replaced `any` types with proper `OAuthTokens` interface for Google OAuth token handling
- Added MCP server controller tests covering tool definitions and handler setup
- Fixed all ESLint TypeScript warnings

### Fixed

- Jest configuration and test failures resolved
- Test coverage increased from 44% to 49%

## [1.1.0] - 2025-07-15

### Added

- Browser launcher: OAuth URL opens automatically in the default browser
- Comprehensive test suite with Jest and TypeScript (ts-jest ESM)

### Fixed

- esbuild updated from 0.20.2 to 0.25.8 (security vulnerability fix)

## [1.0.0] - 2025-06-01

### Added

- Initial release: MCP Google Sheets server with OAuth2 support
- 5 core tools: `find_sheets`, `get_sheet_data`, `create_sheet`, `update_sheet`, `delete_sheet`
- Google Sheets API v4 integration
- Google Drive API v3 integration for file discovery and management
- OAuth2 authentication flow with local callback server
- Structured logging with Winston
- esbuild bundling for production
- CI workflow with pnpm support

[1.2.0]: https://github.com/rcantore/mcp-gsheets-integration/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/rcantore/mcp-gsheets-integration/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/rcantore/mcp-gsheets-integration/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/rcantore/mcp-gsheets-integration/releases/tag/v1.0.0
