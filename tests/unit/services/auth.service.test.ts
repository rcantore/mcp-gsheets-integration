/**
 * Unit tests for GoogleAuthService
 */

import { GoogleAuthService } from '../../../src/services/auth.js';
import fs from 'fs/promises';
import '../../mocks/googleapis.ts';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../src/config/index.js', () => ({
  config: {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRedirectUri: 'http://localhost:3000/oauth/callback'
  }
}));
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));
jest.mock('../../../src/services/oauth-server.js', () => ({
  OAuthServer: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?mock=true'),
    startAuthFlow: jest.fn().mockResolvedValue({
      tokens: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600000,
      }
    })
  }))
}));
jest.mock('../../../src/utils/browser-launcher.js', () => ({
  BrowserLauncherService: jest.fn().mockImplementation(() => ({
    openUrl: jest.fn().mockResolvedValue(undefined)
  }))
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('GoogleAuthService', () => {
  let authService: GoogleAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the module to get a fresh instance
    jest.resetModules();
  });

  describe('constructor and initialization', () => {
    it('should initialize with stored tokens when available', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({
        access_token: 'stored-access-token',
        refresh_token: 'stored-refresh-token',
        expiry_date: Date.now() + 3600000,
      }));

      authService = new GoogleAuthService();
      
      // Wait a bit for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('.oauth-tokens.json'),
        'utf-8'
      );
    });

    it('should handle missing stored tokens gracefully', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      authService = new GoogleAuthService();
      
      // Wait a bit for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not throw, just log a warning
      expect(mockFs.readFile).toHaveBeenCalled();
    });
  });

  describe('ensureAuthenticated', () => {
    beforeEach(() => {
      mockFs.readFile.mockRejectedValue(new Error('No stored tokens'));
      authService = new GoogleAuthService();
    });

    it('should authenticate when no access token exists', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      
      await authService.ensureAuthenticated();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.oauth-tokens.json'),
        expect.stringContaining('"access_token"')
      );
    });

    it('should refresh expired token when refresh token is available', async () => {
      // Mock the oauth2Client to have expired credentials with refresh token
      const expiredTokens = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() - 1000, // Expired
      };
      
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(expiredTokens));
      mockFs.writeFile.mockResolvedValue(undefined);

      authService = new GoogleAuthService();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for init

      await authService.ensureAuthenticated();

      // Should save refreshed tokens
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getAuthClient', () => {
    beforeEach(() => {
      mockFs.readFile.mockRejectedValue(new Error('No stored tokens'));
      authService = new GoogleAuthService();
    });

    it('should return authenticated client', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const client = await authService.getAuthClient();
      
      expect(client).toBeDefined();
    });
  });

  describe('getSheetsClient', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
      }));
      authService = new GoogleAuthService();
    });

    it('should return sheets client', () => {
      const sheetsClient = authService.getSheetsClient();
      
      expect(sheetsClient).toBeDefined();
    });
  });

  describe('getDriveClient', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
      }));
      authService = new GoogleAuthService();
    });

    it('should return drive client', () => {
      const driveClient = authService.getDriveClient();
      
      expect(driveClient).toBeDefined();
    });
  });
});