import http from 'http';
import crypto from 'crypto';
import { google } from 'googleapis';
import type { OAuthTokens } from '../types/auth.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export class OAuthServer {
  private server: http.Server | undefined;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private codeVerifier?: string;
  private expectedState?: string;

  constructor(oauth2Client?: InstanceType<typeof google.auth.OAuth2>) {
    this.oauth2Client = oauth2Client ?? new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ];

    this.codeVerifier = generateCodeVerifier();
    this.expectedState = generateState();
    const codeChallenge = generateCodeChallenge(this.codeVerifier);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code_challenge_method: 'S256' as any,
      code_challenge: codeChallenge,
      state: this.expectedState,
    });

    logger.info('OAuth authorization URL generated');
    return authUrl;
  }

  async waitForCallback(): Promise<{ tokens: OAuthTokens }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = new URL(req.url!, `http://${req.headers['host'] ?? 'localhost'}`);

          if (parsedUrl.pathname === '/oauth/callback') {
            const code = parsedUrl.searchParams.get('code');
            const state = parsedUrl.searchParams.get('state');
            const error = parsedUrl.searchParams.get('error');

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Authorization denied</h1>');
              this.stopServer();
              reject(new Error(`OAuth authorization denied: ${error}`));
              return;
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: Authorization code not received</h1>');
              this.stopServer();
              reject(new Error('Authorization code not received'));
              return;
            }

            if (state !== this.expectedState) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: Invalid state parameter</h1>');
              this.stopServer();
              reject(new Error('CSRF validation failed: state mismatch'));
              return;
            }

            try {
              const tokenResponse = await this.oauth2Client.getToken({
                code,
                codeVerifier: this.codeVerifier!,
              });
              const tokens = tokenResponse.tokens;
              this.oauth2Client.setCredentials(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>Authorization Successful!</h1>
                <p>You can now close this window and return to your application.</p>
                <script>window.close();</script>
              `);

              logger.info('OAuth tokens received successfully');
              this.stopServer();
              resolve({ tokens: tokens as OAuthTokens });
            } catch (tokenError) {
              logger.error('Failed to exchange authorization code for tokens', { error: tokenError });
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: Failed to get access token</h1>');
              this.stopServer();
              reject(tokenError);
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Not Found</h1>');
          }
        } catch (serverError) {
          logger.error('OAuth callback error', { error: serverError });
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Internal Server Error</h1>');
          this.stopServer();
          reject(serverError);
        }
      });

      this.server.listen(config.port, '127.0.0.1', () => {
        logger.info(`OAuth callback server started on http://127.0.0.1:${config.port}`);
      });

      this.server.on('error', (error) => {
        logger.error('OAuth server error', { error });
        reject(error);
      });
    });
  }

  private stopServer(): void {
    if (this.server) {
      this.server.closeAllConnections();
      this.server.close();
      this.server = undefined;
      logger.info('OAuth callback server stopped');
    }
  }
}
