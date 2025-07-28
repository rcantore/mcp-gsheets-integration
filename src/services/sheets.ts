import { GoogleAuthService } from './auth.js';
import { logger } from '../utils/logger.js';
import { handleGoogleApiError, ValidationError } from '../utils/errors.js';
import {
  SheetMetadata,
  SheetData,
  CreateSheetRequest,
  UpdateSheetRequest,
  FindSheetsRequest,
} from '../types/sheets.js';

export class GoogleSheetsService {
  private authService: GoogleAuthService;

  constructor() {
    this.authService = new GoogleAuthService();
  }

  async findSheets(request: FindSheetsRequest): Promise<SheetMetadata[]> {
    try {
      await this.authService.ensureAuthenticated();
      const drive = this.authService.getDriveClient();
      
      let query = "mimeType='application/vnd.google-apps.spreadsheet'";
      if (request.query) {
        query += ` and name contains '${request.query}'`;
      }

      const response = await drive.files.list({
        q: query,
        pageSize: request.maxResults,
        orderBy: request.orderBy === 'name' ? 'name' : request.orderBy,
        fields: 'files(id,name,webViewLink,createdTime,modifiedTime,owners)',
      });

      const sheets: SheetMetadata[] = (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        url: file.webViewLink!,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!,
        owner: file.owners?.[0]?.displayName || undefined,
      }));

      logger.info(`Found ${sheets.length} sheets`, { query: request.query });
      return sheets;
    } catch (error) {
      logger.error('Failed to find sheets', { error, request });
      handleGoogleApiError(error);
    }
  }

  async getSheetData(sheetId: string, range?: string): Promise<SheetData> {
    if (!sheetId?.trim()) {
      throw new ValidationError('Sheet ID is required');
    }

    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();
      
      const effectiveRange = range || 'A1:Z1000';
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: effectiveRange,
      });

      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const sheetName = sheetInfo.data.sheets?.[0]?.properties?.title || 'Sheet1';

      const data: SheetData = {
        sheetId,
        sheetName,
        range: effectiveRange,
        values: (response.data.values || []) as string[][],
      };

      logger.info(`Retrieved sheet data`, { sheetId, range: effectiveRange, rowCount: data.values.length });
      return data;
    } catch (error) {
      logger.error('Failed to get sheet data', { error, sheetId, range });
      handleGoogleApiError(error);
    }
  }

  async createSheet(request: CreateSheetRequest): Promise<SheetMetadata> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      const spreadsheetBody = {
        properties: {
          title: request.title,
        },
        sheets: request.sheets?.map(sheet => ({
          properties: {
            title: sheet.name,
            gridProperties: {
              rowCount: sheet.rowCount,
              columnCount: sheet.columnCount,
            },
          },
        })) || [{
          properties: {
            title: 'Sheet1',
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
            },
          },
        }],
      };

      const response = await sheets.spreadsheets.create({
        requestBody: spreadsheetBody,
      });

      const metadata: SheetMetadata = {
        id: response.data.spreadsheetId!,
        name: response.data.properties?.title!,
        url: response.data.spreadsheetUrl!,
        createdTime: new Date().toISOString(),
        modifiedTime: new Date().toISOString(),
      };

      logger.info(`Created new sheet`, { sheetId: metadata.id, title: request.title });
      return metadata;
    } catch (error) {
      logger.error('Failed to create sheet', { error, request });
      handleGoogleApiError(error);
    }
  }

  async updateSheet(request: UpdateSheetRequest): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.values.update({
        spreadsheetId: request.sheetId,
        range: request.range,
        valueInputOption: 'RAW',
        requestBody: {
          values: request.values,
          majorDimension: request.majorDimension,
        },
      });

      logger.info(`Updated sheet data`, { 
        sheetId: request.sheetId, 
        range: request.range, 
        cellCount: request.values.length * (request.values[0]?.length || 0) 
      });
    } catch (error) {
      logger.error('Failed to update sheet', { error, request });
      handleGoogleApiError(error);
    }
  }

  async deleteSheet(sheetId: string): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const drive = this.authService.getDriveClient();

      await drive.files.delete({
        fileId: sheetId,
      });

      logger.info(`Deleted sheet`, { sheetId });
    } catch (error) {
      logger.error('Failed to delete sheet', { error, sheetId });
      handleGoogleApiError(error);
    }
  }
}