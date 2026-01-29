import { GoogleAuthService } from './auth.js';
import { logger } from '../utils/logger.js';
import { handleGoogleApiError, ValidationError } from '../utils/errors.js';
import {
  SheetMetadata,
  SheetData,
  CreateSheetRequest,
  UpdateSheetRequest,
  FindSheetsRequest,
  AppendValuesRequest,
  BatchUpdateRequest,
  AddSheetTabRequest,
} from '../types/sheets.js';

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export class GoogleSheetsService {
  private authService: GoogleAuthService;

  constructor(authService?: GoogleAuthService) {
    this.authService = authService ?? new GoogleAuthService();
  }

  async findSheets(request: FindSheetsRequest): Promise<SheetMetadata[]> {
    try {
      await this.authService.ensureAuthenticated();
      const drive = this.authService.getDriveClient();

      let query = "mimeType='application/vnd.google-apps.spreadsheet'";
      if (request.query) {
        query += ` and name contains '${escapeDriveQuery(request.query)}'`;
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
        valueInputOption: request.valueInputOption ?? 'RAW',
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

      await drive.files.update({
        fileId: sheetId,
        requestBody: { trashed: true },
      });

      logger.info(`Trashed sheet`, { sheetId });
    } catch (error) {
      logger.error('Failed to trash sheet', { error, sheetId });
      handleGoogleApiError(error);
    }
  }

  async appendValues(request: AppendValuesRequest): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.values.append({
        spreadsheetId: request.sheetId,
        range: request.range,
        valueInputOption: request.valueInputOption ?? 'RAW',
        requestBody: {
          values: request.values,
        },
      });

      logger.info(`Appended values`, {
        sheetId: request.sheetId,
        range: request.range,
        rowCount: request.values.length,
      });
    } catch (error) {
      logger.error('Failed to append values', { error, request });
      handleGoogleApiError(error);
    }
  }

  async clearRange(sheetId: string, range: string): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range,
      });

      logger.info(`Cleared range`, { sheetId, range });
    } catch (error) {
      logger.error('Failed to clear range', { error, sheetId, range });
      handleGoogleApiError(error);
    }
  }

  async batchGet(sheetId: string, ranges: string[]): Promise<Record<string, string[][]>> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges,
      });

      const result: Record<string, string[][]> = {};
      for (const valueRange of response.data.valueRanges || []) {
        if (valueRange.range) {
          result[valueRange.range] = (valueRange.values || []) as string[][];
        }
      }

      logger.info(`Batch get completed`, { sheetId, rangeCount: ranges.length });
      return result;
    } catch (error) {
      logger.error('Failed to batch get', { error, sheetId, ranges });
      handleGoogleApiError(error);
    }
  }

  async batchUpdate(request: BatchUpdateRequest): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: request.sheetId,
        requestBody: {
          valueInputOption: request.valueInputOption ?? 'RAW',
          data: request.data.map(d => ({
            range: d.range,
            values: d.values,
          })),
        },
      });

      logger.info(`Batch update completed`, { sheetId: request.sheetId, rangeCount: request.data.length });
    } catch (error) {
      logger.error('Failed to batch update', { error, request });
      handleGoogleApiError(error);
    }
  }

  async getSpreadsheetInfo(sheetId: string): Promise<Record<string, unknown>> {
    if (!sheetId?.trim()) {
      throw new ValidationError('Sheet ID is required');
    }

    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const info = {
        spreadsheetId: response.data.spreadsheetId,
        title: response.data.properties?.title,
        locale: response.data.properties?.locale,
        timeZone: response.data.properties?.timeZone,
        url: response.data.spreadsheetUrl,
        sheets: (response.data.sheets || []).map(s => ({
          sheetId: s.properties?.sheetId,
          title: s.properties?.title,
          index: s.properties?.index,
          rowCount: s.properties?.gridProperties?.rowCount,
          columnCount: s.properties?.gridProperties?.columnCount,
        })),
        namedRanges: response.data.namedRanges?.map(nr => ({
          name: nr.name,
          range: nr.range,
        })) || [],
      };

      logger.info(`Retrieved spreadsheet info`, { sheetId });
      return info;
    } catch (error) {
      logger.error('Failed to get spreadsheet info', { error, sheetId });
      handleGoogleApiError(error);
    }
  }

  async addSheetTab(request: AddSheetTabRequest): Promise<{ sheetId: number; title: string }> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      const addRequest: Record<string, unknown> = { title: request.title };
      if (request.rowCount || request.columnCount) {
        addRequest['gridProperties'] = {
          ...(request.rowCount ? { rowCount: request.rowCount } : {}),
          ...(request.columnCount ? { columnCount: request.columnCount } : {}),
        };
      }

      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: request.sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: addRequest } }],
        },
      });

      const addedSheet = response.data.replies?.[0]?.addSheet?.properties;

      logger.info(`Added sheet tab`, { sheetId: request.sheetId, title: request.title });
      return {
        sheetId: addedSheet?.sheetId ?? 0,
        title: addedSheet?.title ?? request.title,
      };
    } catch (error) {
      logger.error('Failed to add sheet tab', { error, request });
      handleGoogleApiError(error);
    }
  }

  async deleteSheetTab(sheetId: string, tabId: number): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ deleteSheet: { sheetId: tabId } }],
        },
      });

      logger.info(`Deleted sheet tab`, { sheetId, tabId });
    } catch (error) {
      logger.error('Failed to delete sheet tab', { error, sheetId, tabId });
      handleGoogleApiError(error);
    }
  }

  async renameSheetTab(sheetId: string, tabId: number, newTitle: string): Promise<void> {
    try {
      await this.authService.ensureAuthenticated();
      const sheets = this.authService.getSheetsClient();

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: tabId, title: newTitle },
              fields: 'title',
            },
          }],
        },
      });

      logger.info(`Renamed sheet tab`, { sheetId, tabId, newTitle });
    } catch (error) {
      logger.error('Failed to rename sheet tab', { error, sheetId, tabId, newTitle });
      handleGoogleApiError(error);
    }
  }
}
