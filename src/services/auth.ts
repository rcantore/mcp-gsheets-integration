import { google } from 'googleapis';
import type { OAuthTokens } from '../types/auth.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { BrowserLauncherService } from '../utils/browser-launcher.js';
import { OAuthServer } from './oauth-server.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

function getTokensFilePath(): string {
  const configDir = path.join(os.homedir(), '.config', 'mcp-gsheets-server');
  return path.join(configDir, 'oauth-tokens.json');
}

export class GoogleAuthService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private oauthServer: OAuthServer;
  private browserLauncher: BrowserLauncherService;
  private tokensFile: string;

  constructor(
    oauth2Client?: InstanceType<typeof google.auth.OAuth2>,
    oauthServer?: OAuthServer,
    browserLauncher?: BrowserLauncherService,
  ) {
    this.oauth2Client = oauth2Client ?? new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
    this.oauthServer = oauthServer ?? new OAuthServer(this.oauth2Client);
    this.browserLauncher = browserLauncher ?? new BrowserLauncherService();
    this.tokensFile = getTokensFilePath();
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      await this.loadStoredTokens();
      logger.info('Google Auth service initialized with stored tokens');
    } catch {
      logger.warn('No stored tokens found, authentication required');
    }
  }

  private async loadStoredTokens(): Promise<void> {
    try {
      const tokensData = await fs.readFile(this.tokensFile, 'utf-8');
      const tokens = JSON.parse(tokensData);
      this.oauth2Client.setCredentials(tokens);
      logger.info('Loaded stored OAuth tokens');
    } catch {
      throw new Error('No stored tokens available');
    }
  }

  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    try {
      const dir = path.dirname(this.tokensFile);
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2), { mode: 0o600 });
      logger.info('OAuth tokens saved to disk');
    } catch (error) {
      logger.error('Failed to save tokens', { error });
    }
  }

  async ensureAuthenticated(): Promise<void> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (!credentials.access_token) {
        await this.authenticate();
        return;
      }

      if (credentials.expiry_date && Date.now() >= credentials.expiry_date) {
        if (credentials.refresh_token) {
          logger.info('Access token expired, refreshing...');
          const refreshResult = await this.oauth2Client.refreshAccessToken();
          const newCredentials = refreshResult.credentials;
          this.oauth2Client.setCredentials(newCredentials);
          await this.saveTokens(newCredentials as OAuthTokens);
          logger.info('Access token refreshed successfully');
        } else {
          logger.warn('No refresh token available, re-authentication required');
          await this.authenticate();
        }
      }
    } catch (error) {
      logger.error('Authentication check failed', { error });
      await this.authenticate();
    }
  }

  private async authenticate(): Promise<void> {
    try {
      logger.info('Starting OAuth authentication flow...');

      const authUrl = this.oauthServer.generateAuthUrl();
      const callbackPromise = this.oauthServer.waitForCallback();
      await this.browserLauncher.openUrl(authUrl);

      const { tokens } = await callbackPromise;

      this.oauth2Client.setCredentials(tokens);
      await this.saveTokens(tokens);
      logger.info('OAuth authentication completed successfully');
    } catch (error) {
      logger.error('OAuth authentication failed', { error });
      throw new Error('Failed to authenticate with Google APIs');
    }
  }

  getSheetsClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return google.sheets({ version: 'v4', auth: this.oauth2Client as any });
  }

  getDriveClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return google.drive({ version: 'v3', auth: this.oauth2Client as any });
  }
}
