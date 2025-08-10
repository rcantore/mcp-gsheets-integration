/**
 * Unit tests for GoogleSheetsService
 */

import { GoogleSheetsService } from '../../../src/services/sheets.js';
import { GoogleAuthService } from '../../../src/services/auth.js';
import { ValidationError } from '../../../src/utils/errors.js';
import '../../mocks/googleapis.ts';

// Mock the GoogleAuthService
jest.mock('../../../src/services/auth.js');
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('GoogleSheetsService', () => {
  let sheetsService: GoogleSheetsService;
  let mockAuthService: jest.Mocked<GoogleAuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock auth service
    mockAuthService = {
      ensureAuthenticated: jest.fn(),
      getSheetsClient: jest.fn(),
      getDriveClient: jest.fn(),
      getAuthClient: jest.fn(),
    } as any;

    // Mock the constructor to return our mock
    (GoogleAuthService as jest.MockedClass<typeof GoogleAuthService>).mockImplementation(() => mockAuthService);

    sheetsService = new GoogleSheetsService();
  });

  describe('findSheets', () => {
    beforeEach(() => {
      mockAuthService.getDriveClient.mockReturnValue({
        files: {
          list: jest.fn().mockResolvedValue({
            data: {
              files: [
                {
                  id: 'sheet1',
                  name: 'Test Sheet 1',
                  webViewLink: 'https://docs.google.com/spreadsheets/d/sheet1',
                  createdTime: '2023-01-01T00:00:00.000Z',
                  modifiedTime: '2023-01-02T00:00:00.000Z',
                  owners: [{ displayName: 'Test User' }]
                },
                {
                  id: 'sheet2',
                  name: 'Test Sheet 2',
                  webViewLink: 'https://docs.google.com/spreadsheets/d/sheet2',
                  createdTime: '2023-01-03T00:00:00.000Z',
                  modifiedTime: '2023-01-04T00:00:00.000Z',
                  owners: [{ displayName: 'Test User' }]
                }
              ]
            }
          })
        }
      } as any);
    });

    it('should find sheets successfully', async () => {
      const request = { maxResults: 10 };
      const result = await sheetsService.findSheets(request);

      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sheet1',
        name: 'Test Sheet 1',
        url: 'https://docs.google.com/spreadsheets/d/sheet1',
        createdTime: '2023-01-01T00:00:00.000Z',
        modifiedTime: '2023-01-02T00:00:00.000Z',
        owner: 'Test User'
      });
    });

    it('should handle search query', async () => {
      const mockList = jest.fn().mockResolvedValue({ data: { files: [] } });
      mockAuthService.getDriveClient.mockReturnValue({
        files: { list: mockList }
      } as any);

      const request = { query: 'test', maxResults: 10, orderBy: 'modifiedTime' as const };
      await sheetsService.findSheets(request);

      expect(mockList).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and name contains 'test'",
        pageSize: 10,
        orderBy: 'modifiedTime',
        fields: 'files(id,name,webViewLink,createdTime,modifiedTime,owners)'
      });
    });
  });

  describe('getSheetData', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [
                  ['Header 1', 'Header 2'],
                  ['Value 1', 'Value 2']
                ]
              }
            })
          },
          get: jest.fn().mockResolvedValue({
            data: {
              sheets: [{
                properties: {
                  title: 'Test Sheet'
                }
              }]
            }
          })
        }
      } as any);
    });

    it('should get sheet data successfully', async () => {
      const result = await sheetsService.getSheetData('test-sheet-id', 'A1:B2');

      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      expect(result).toEqual({
        sheetId: 'test-sheet-id',
        sheetName: 'Test Sheet',
        range: 'A1:B2',
        values: [
          ['Header 1', 'Header 2'],
          ['Value 1', 'Value 2']
        ]
      });
    });

    it('should use default range when none provided', async () => {
      await sheetsService.getSheetData('test-sheet-id');

      const mockGet = mockAuthService.getSheetsClient().spreadsheets.values.get as jest.Mock;
      expect(mockGet).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'A1:Z1000'
      });
    });

    it('should throw ValidationError for empty sheet ID', async () => {
      await expect(sheetsService.getSheetData('')).rejects.toThrow(ValidationError);
      await expect(sheetsService.getSheetData('   ')).rejects.toThrow(ValidationError);
    });
  });

  describe('createSheet', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          create: jest.fn().mockResolvedValue({
            data: {
              spreadsheetId: 'new-sheet-id',
              properties: { title: 'New Test Sheet' },
              spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-sheet-id'
            }
          })
        }
      } as any);
    });

    it('should create sheet successfully', async () => {
      const request = { title: 'New Test Sheet' };
      const result = await sheetsService.createSheet(request);

      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'new-sheet-id',
        name: 'New Test Sheet',
        url: 'https://docs.google.com/spreadsheets/d/new-sheet-id',
        createdTime: expect.any(String),
        modifiedTime: expect.any(String)
      });
    });

    it('should create sheet with custom sheets configuration', async () => {
      const request = {
        title: 'New Test Sheet',
        sheets: [{
          name: 'Custom Sheet',
          rowCount: 500,
          columnCount: 10
        }]
      };
      
      await sheetsService.createSheet(request);

      const mockCreate = mockAuthService.getSheetsClient().spreadsheets.create as jest.Mock;
      expect(mockCreate).toHaveBeenCalledWith({
        requestBody: {
          properties: { title: 'New Test Sheet' },
          sheets: [{
            properties: {
              title: 'Custom Sheet',
              gridProperties: {
                rowCount: 500,
                columnCount: 10
              }
            }
          }]
        }
      });
    });
  });

  describe('updateSheet', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          values: {
            update: jest.fn().mockResolvedValue({ data: {} })
          }
        }
      } as any);
    });

    it('should update sheet successfully', async () => {
      const request = {
        sheetId: 'test-sheet-id',
        range: 'A1:B2',
        values: [['New Value 1', 'New Value 2']],
        majorDimension: 'ROWS' as const
      };

      await sheetsService.updateSheet(request);

      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      const mockUpdate = mockAuthService.getSheetsClient().spreadsheets.values.update as jest.Mock;
      expect(mockUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'A1:B2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['New Value 1', 'New Value 2']],
          majorDimension: 'ROWS'
        }
      });
    });
  });

  describe('deleteSheet', () => {
    beforeEach(() => {
      mockAuthService.getDriveClient.mockReturnValue({
        files: {
          delete: jest.fn().mockResolvedValue({ data: {} })
        }
      } as any);
    });

    it('should delete sheet successfully', async () => {
      await sheetsService.deleteSheet('test-sheet-id');

      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      const mockDelete = mockAuthService.getDriveClient().files.delete as jest.Mock;
      expect(mockDelete).toHaveBeenCalledWith({
        fileId: 'test-sheet-id'
      });
    });
  });
});