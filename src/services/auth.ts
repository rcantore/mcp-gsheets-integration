import { google } from 'googleapis';

type OAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  [key: string]: any;
};
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { BrowserLauncherService } from '../utils/browser-launcher.js';
import { OAuthServer } from './oauth-server.js';
import fs from 'fs/promises';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), '.oauth-tokens.json');

export class GoogleAuthService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private oauthServer: OAuthServer;
  private browserLauncher: BrowserLauncherService;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
    this.oauthServer = new OAuthServer();
    this.browserLauncher = new BrowserLauncherService();
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Try to load existing tokens
      await this.loadStoredTokens();
      logger.info('Google Auth service initialized with stored tokens');
    } catch (error) {
      logger.warn('No stored tokens found, authentication required');
      // Don't throw here - let the first API call trigger auth flow
    }
  }

  private async loadStoredTokens(): Promise<void> {
    try {
      const tokensData = await fs.readFile(TOKENS_FILE, 'utf-8');
      const tokens = JSON.parse(tokensData);
      this.oauth2Client.setCredentials(tokens);
      logger.info('Loaded stored OAuth tokens');
    } catch (error) {
      throw new Error('No stored tokens available');
    }
  }

  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    try {
      await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
      logger.info('OAuth tokens saved to disk');
    } catch (error) {
      logger.error('Failed to save tokens', { error });
    }
  }

  async ensureAuthenticated(): Promise<void> {
    try {
      // Check if we have valid credentials
      const credentials = this.oauth2Client.credentials;
      if (!credentials.access_token) {
        await this.authenticate();
        return;
      }

      // Check if token is expired and refresh if needed
      if (credentials.expiry_date && Date.now() >= credentials.expiry_date) {
        if (credentials.refresh_token) {
          logger.info('Access token expired, refreshing...');
          const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(newCredentials);
          await this.saveTokens(newCredentials);
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
      
      // Generate the auth URL first
      const authUrl = this.oauthServer.generateAuthUrl();
      
      // Immediately open browser with the URL
      await this.browserLauncher.openUrl(authUrl);
      
      // Now start the auth flow and wait for completion
      const { tokens } = await this.oauthServer.startAuthFlow();

      this.oauth2Client.setCredentials(tokens);
      await this.saveTokens(tokens);
      logger.info('OAuth authentication completed successfully');
    } catch (error) {
      logger.error('OAuth authentication failed', { error });
      throw new Error('Failed to authenticate with Google APIs');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAuthClient(): Promise<any> {
    await this.ensureAuthenticated();
    return this.oauth2Client;
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