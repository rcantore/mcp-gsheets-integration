# Contributing to MCP Google Sheets Server

Thank you for your interest in contributing to this project. This document provides guidelines and information for contributors.

## Code of Conduct

This project follows a professional and respectful approach to collaboration. Please:

- Be respectful and constructive in discussions
- Focus on technical merit and project goals
- Welcome newcomers and help them get started
- Report any inappropriate behavior to the project maintainer

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm package manager
- Google Cloud account for testing
- Basic knowledge of TypeScript and MCP protocol

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/mcp-gsheets-integration.git
   cd mcp-gsheets-integration
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Set up your development environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Google OAuth2 credentials
   ```

5. Build and test:
   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   ```

## Development Workflow

### Making Changes

1. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards below

3. Test your changes thoroughly:
   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   ```

4. Test with MCP Inspector:
   ```bash
   mcp-inspector node dist/index.js
   ```

5. Commit your changes with clear, descriptive messages:
   ```bash
   git commit -m "Add feature: brief description of changes"
   ```

### Coding Standards

**TypeScript:**
- Use strict TypeScript configuration
- Provide explicit type annotations for public APIs
- Use meaningful variable and function names
- Follow existing code organization patterns

**Code Style:**
- Use the existing ESLint configuration
- Maintain consistent indentation (2 spaces)
- Keep line length reasonable (prefer under 100 characters)
- Use async/await over Promise chains

**Error Handling:**
- Use custom error types from `src/utils/errors.ts`
- Provide meaningful error messages
- Log errors appropriately (use stderr for MCP compatibility)
- Handle Google API errors gracefully

**Security:**
- Never log OAuth2 tokens or sensitive data
- Use proper input validation with Zod schemas
- Follow OAuth2 security best practices
- Sanitize error messages to avoid information leakage

### Testing

- Test all changes with real Google Sheets API calls
- Verify MCP protocol compliance
- Test OAuth2 authentication flow
- Ensure proper error handling for edge cases
- Test with both MCP Inspector and Claude Desktop

## Types of Contributions

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce the problem
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Error messages and logs
- MCP client being used (Claude Desktop, Inspector, etc.)

Use the bug report template when creating issues.

### Feature Requests

For new features, please:

- Describe the use case and motivation
- Explain how it fits with the project goals
- Consider the security implications
- Provide examples of how it would be used
- Discuss potential implementation approaches

### Documentation Improvements

Documentation contributions are welcome:

- README updates and clarifications
- Code comments and docstrings
- Security guidance updates
- Troubleshooting guides
- Example configurations

### Code Contributions

**Priority Areas:**
- Bug fixes and stability improvements
- Security enhancements
- Performance optimizations
- Additional Google Sheets API functionality
- Better error handling and logging
- Test coverage improvements

**Implementation Guidelines:**
- Maintain backward compatibility when possible
- Follow existing architectural patterns
- Add appropriate type definitions
- Include inline documentation for complex logic
- Consider security implications of changes

## Pull Request Process

1. **Before Submitting:**
   - Ensure all tests pass
   - Update documentation if needed
   - Check that your changes don't break existing functionality
   - Verify security implications

2. **Pull Request Description:**
   - Clearly describe what changes were made
   - Explain the motivation for the changes
   - Reference any related issues
   - Include testing instructions
   - Note any breaking changes

3. **Review Process:**
   - Maintainer will review code for quality and security
   - Feedback will be provided for any needed changes
   - CI checks must pass before merging
   - Large changes may require additional discussion

4. **After Approval:**
   - Squash commits if requested
   - Maintainer will handle the merge

## Project Architecture

Understanding the codebase structure:

```
src/
├── config/           # Configuration management
├── controllers/      # MCP server implementation  
├── services/         # Google API integration
├── types/           # TypeScript type definitions
└── utils/           # Utilities and error handling
```

**Key Components:**
- `McpSheetsServer`: Main MCP protocol handler
- `GoogleAuthService`: OAuth2 authentication management
- `GoogleSheetsService`: Google Sheets API operations
- Error handling system with custom error types
- Zod schemas for runtime type validation

## Release Process

Releases are managed by the project maintainer:

1. Version bumping follows semantic versioning
2. Changes are documented in the changelog
3. Releases include built artifacts
4. Security updates are prioritized

## Questions and Support

- Check existing issues and documentation first
- Create GitHub issues for bugs and feature requests
- Use discussions for general questions
- Contact maintainer for security-related issues

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to making MCP Google Sheets integration better for everyone!