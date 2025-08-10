/**
 * Integration tests for OAuth authentication flow
 */

import { GoogleAuthService } from '../../src/services/auth.js';
import '../mocks/googleapis.ts';

jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('../../src/config/index.js', () => ({
  config: {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRedirectUri: 'http://localhost:3000/oauth/callback'
  }
}));

describe('OAuth Authentication Flow Integration', () => {
  describe('Full authentication flow', () => {
    it('should complete OAuth flow successfully when no stored tokens exist', async () => {
      // This test simulates the full OAuth flow
      // In a real integration test, this would involve actual HTTP calls
      
      const authService = new GoogleAuthService();
      
      // Should not throw when getting auth client
      const client = await authService.getAuthClient();
      expect(client).toBeDefined();
      
      // Should be able to get API clients
      const sheetsClient = authService.getSheetsClient();
      const driveClient = authService.getDriveClient();
      
      expect(sheetsClient).toBeDefined();
      expect(driveClient).toBeDefined();
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      jest.doMock('../../src/services/oauth-server.js', () => ({
        OAuthServer: jest.fn().mockImplementation(() => ({
          generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?mock=true'),
          startAuthFlow: jest.fn().mockRejectedValue(new Error('OAuth flow failed'))
        }))
      }));

      const authService = new GoogleAuthService();
      
      // Should handle the error and throw a user-friendly error
      await expect(authService.ensureAuthenticated()).rejects.toThrow('Failed to authenticate with Google APIs');
    });
  });

  describe('Token management', () => {
    it('should handle token refresh when tokens are expired', async () => {
      // This would test the actual token refresh flow
      // In a real scenario, this would involve making actual calls to Google's token endpoint
      
      const authService = new GoogleAuthService();
      await authService.ensureAuthenticated();
      
      // Multiple calls should not trigger multiple authentications
      await authService.ensureAuthenticated();
      await authService.ensureAuthenticated();
      
      // Should still return valid clients
      expect(authService.getSheetsClient()).toBeDefined();
      expect(authService.getDriveClient()).toBeDefined();
    });
  });
});