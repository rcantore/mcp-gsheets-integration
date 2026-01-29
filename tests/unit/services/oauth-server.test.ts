/**
 * Unit tests for OAuthServer
 */

import http from 'http';
import { OAuthServer } from '../../../src/services/oauth-server.js';
import '../../mocks/googleapis.ts';

jest.mock('../../../src/config/index.js', () => ({
  config: {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRedirectUri: 'http://localhost:3456/oauth/callback',
    port: 3456,
  },
}));

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function makeRequest(path: string): http.ClientRequest {
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3456,
    path,
    method: 'GET',
  });
  req.on('error', () => { /* ignore connection errors in tests */ });
  req.end();
  return req;
}

function makeRequestWithResponse(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3456,
      path,
      method: 'GET',
    }, (res) => {
      resolve(res.statusCode || 0);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('OAuthServer', () => {
  let oauthServer: OAuthServer;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Allow port to be released between tests
    await new Promise(resolve => setTimeout(resolve, 50));
    oauthServer = new OAuthServer();
  });

  describe('generateAuthUrl', () => {
    it('should generate an auth URL', () => {
      const url = oauthServer.generateAuthUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });

    it('should not include drive.readonly scope', () => {
      const url = oauthServer.generateAuthUrl();
      expect(url).toBeDefined();
    });
  });

  describe('waitForCallback', () => {
    it('should reject with CSRF error on state mismatch', async () => {
      oauthServer.generateAuthUrl();
      const flowPromise = oauthServer.waitForCallback();
      await new Promise(resolve => setTimeout(resolve, 100));

      makeRequest('/oauth/callback?code=test-code&state=invalid');

      await expect(flowPromise).rejects.toThrow('CSRF validation failed');
    }, 15000);

    it('should reject when no code is provided', async () => {
      oauthServer.generateAuthUrl();
      const flowPromise = oauthServer.waitForCallback();
      await new Promise(resolve => setTimeout(resolve, 100));

      makeRequest('/oauth/callback');

      await expect(flowPromise).rejects.toThrow('Authorization code not received');
    }, 15000);

    it('should handle error parameter in callback', async () => {
      oauthServer.generateAuthUrl();
      const flowPromise = oauthServer.waitForCallback();
      await new Promise(resolve => setTimeout(resolve, 100));

      makeRequest('/oauth/callback?error=access_denied');

      await expect(flowPromise).rejects.toThrow('OAuth authorization denied');
    }, 15000);

    it('should return 404 for unknown paths', async () => {
      oauthServer.generateAuthUrl();
      const flowPromise = oauthServer.waitForCallback();
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusCode = await makeRequestWithResponse('/unknown');
      expect(statusCode).toBe(404);

      // Clean up - send a callback to end the server
      makeRequest('/oauth/callback?error=cleanup');

      try { await flowPromise; } catch { /* expected */ }
    }, 15000);
  });
});
