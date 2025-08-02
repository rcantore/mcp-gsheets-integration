import { logger } from './logger.js';
import open from 'open';

/**
 * Interface for browser launching strategies
 */
export interface BrowserLauncher {
  openUrl(url: string): Promise<void>;
}

/**
 * System browser launcher using the 'open' package
 */
export class SystemBrowserLauncher implements BrowserLauncher {
  async openUrl(url: string): Promise<void> {
    try {
      // Use static import since open is externalized in build
      await open(url);
      logger.info('OAuth URL opened in system default browser');
    } catch (error) {
      logger.error('Failed to open system browser', { error });
      throw new Error('Could not open browser automatically');
    }
  }
}

/**
 * Console-only launcher as fallback
 */
export class ConsoleBrowserLauncher implements BrowserLauncher {
  async openUrl(url: string): Promise<void> {
    logger.warn('Browser auto-open not available, using console fallback');
    console.error('\n🔐 Google OAuth Authentication Required');
    console.error('📋 Please open this URL in your browser to authorize the application:');
    console.error(`\n${url}\n`);
    console.error('⏳ Waiting for authorization...');
  }
}

/**
 * Browser launcher with automatic fallback
 */
export class BrowserLauncherService {
  private primaryLauncher: BrowserLauncher;
  private fallbackLauncher: BrowserLauncher;

  constructor() {
    this.primaryLauncher = new SystemBrowserLauncher();
    this.fallbackLauncher = new ConsoleBrowserLauncher();
  }

  async openUrl(url: string): Promise<void> {
    if (!url || typeof url !== 'string') {
      logger.error('Invalid URL provided to browser launcher', { url });
      throw new Error('Invalid URL provided');
    }

    try {
      await this.primaryLauncher.openUrl(url);
      logger.info('Successfully opened OAuth URL in browser');
    } catch (primaryError) {
      logger.warn('Primary browser launcher failed, falling back to console', { error: primaryError });
      
      try {
        await this.fallbackLauncher.openUrl(url);
        logger.info('Fallback to console output successful');
      } catch (fallbackError) {
        logger.error('Both browser launchers failed', { 
          primaryError, 
          fallbackError 
        });
        // Even if fallback fails, don't throw - console output should always work
        console.error(`\n🔐 Manual OAuth Required: ${url}\n`);
      }
    }
  }
}