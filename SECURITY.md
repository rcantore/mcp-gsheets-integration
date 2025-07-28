# Security Policy

## Data Access and Privacy

This MCP server requires significant access to your Google account data. Before using this server, please understand the scope of access and potential security implications.

### Google Drive Access Permissions

When you authorize this server, it requests the following OAuth2 scopes:

- `https://www.googleapis.com/auth/spreadsheets` - Full access to Google Sheets
- `https://www.googleapis.com/auth/drive.readonly` - Read access to Google Drive files
- `https://www.googleapis.com/auth/drive.file` - Access to files created by this application

### What the Server Can Access

**Google Sheets:**
- Read all content from any Google Sheet in your Drive
- Create new Google Sheets documents
- Modify existing Google Sheets content
- Delete Google Sheets files
- Access sheet metadata (creation date, owner, sharing settings)

**Google Drive:**
- List and search all spreadsheet files in your Drive
- Read file metadata for Google Sheets
- Access sharing permissions and collaboration settings

### What the Server Cannot Access

- Other file types in Google Drive (documents, images, videos, etc.)
- Gmail or other Google services
- Personal account information beyond basic profile data
- Files in other Google accounts you may have access to

### Token Storage and Security

**Local Token Storage:**
- OAuth2 tokens are stored in `.oauth-tokens.json` in the project directory
- This file contains sensitive access credentials
- The file is created with default system permissions
- Tokens are stored in plain text (not encrypted)

**Token Lifecycle:**
- Access tokens typically expire after 1 hour
- Refresh tokens are used to obtain new access tokens automatically
- Refresh tokens can remain valid indefinitely until revoked
- No token data is transmitted to external servers (except Google's OAuth endpoints)

### Security Recommendations

**Before First Use:**
1. Review all OAuth2 permissions carefully in the Google consent screen
2. Consider using a dedicated Google account for testing and development
3. Ensure you trust the environment where you're running the server
4. Verify that port 3000 is not exposed to external networks during OAuth flow

**During Operation:**
1. Monitor the server's activity logs for unexpected behavior
2. Regularly review which applications have access to your Google account
3. Set up appropriate file sharing permissions on sensitive sheets
4. Use the server only in trusted network environments

**After Use:**
1. Consider revoking OAuth2 tokens when no longer needed
2. Delete the `.oauth-tokens.json` file if decommissioning the server
3. Review and revoke application access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)

### Incident Response

If you suspect unauthorized access or misuse:

1. **Immediate Action:**
   - Revoke application access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Delete the `.oauth-tokens.json` file
   - Stop the MCP server process

2. **Investigation:**
   - Review Google account activity at [myactivity.google.com](https://myactivity.google.com)
   - Check Google Drive activity and access logs
   - Review any recent changes to your Google Sheets

3. **Reporting:**
   - Report security issues to the project maintainer
   - Consider reporting to Google if you suspect broader account compromise

### Supported Versions

Security updates will be provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

### Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it privately to the project maintainer. Do not create public issues for security vulnerabilities.

**Contact:** Please create a private security advisory on GitHub or contact the maintainer directly.

**Response Time:** We aim to respond to security reports within 48 hours and provide updates on resolution progress.

### Security Best Practices for Developers

If you're contributing to this project:

1. Never log OAuth2 tokens or sensitive user data
2. Use HTTPS for all Google API communications
3. Implement proper error handling to avoid information leakage
4. Follow OAuth2 security best practices
5. Regularly update dependencies to address security vulnerabilities
6. Use TypeScript strict mode to catch potential security issues

### Compliance and Legal

- This server operates under Google's API Terms of Service
- Users are responsible for compliance with their organization's data policies
- Consider data residency and privacy regulations in your jurisdiction
- Review Google's data processing and privacy policies before use

### Questions and Concerns

If you have questions about the security implications of using this server, please:

1. Review this security policy thoroughly
2. Test with non-sensitive data first
3. Consult with your organization's security team if applicable
4. Contact the project maintainer for clarification on specific security concerns

Remember: You are ultimately responsible for the security of your data and the decisions you make about granting access to third-party applications.