import http from 'http';
import url from 'url';
import { google } from 'googleapis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class OAuthServer {
  private server?: http.Server;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
  }

  async startAuthFlow(): Promise<{ authUrl: string; tokens: any }> {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    logger.info('OAuth authorization URL generated', { authUrl });

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url!, true);
          
          if (parsedUrl.pathname === '/oauth/callback') {
            const code = parsedUrl.query['code'] as string;
            
            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: Authorization code not received</h1>');
              reject(new Error('Authorization code not received'));
              return;
            }

            try {
              const { tokens } = await this.oauth2Client.getToken(code);
              this.oauth2Client.setCredentials(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>Authorization Successful!</h1>
                <p>You can now close this window and return to your application.</p>
                <script>window.close();</script>
              `);

              logger.info('OAuth tokens received successfully');
              this.stopServer();
              resolve({ authUrl, tokens });
            } catch (error) {
              logger.error('Failed to exchange authorization code for tokens', { error });
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: Failed to get access token</h1>');
              reject(error);
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Not Found</h1>');
          }
        } catch (error) {
          logger.error('OAuth callback error', { error });
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Internal Server Error</h1>');
          reject(error);
        }
      });

      this.server.listen(3000, () => {
        logger.info('OAuth callback server started on http://localhost:3000');
      });

      this.server.on('error', (error) => {
        logger.error('OAuth server error', { error });
        reject(error);
      });
    });
  }

  setTokens(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
    logger.info('OAuth tokens set successfully');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuthClient(): any {
    return this.oauth2Client;
  }

  private stopServer(): void {
    if (this.server) {
      this.server.close();
      logger.info('OAuth callback server stopped');
    }
  }
}