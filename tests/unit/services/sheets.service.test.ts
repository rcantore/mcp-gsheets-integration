/**
 * Unit tests for GoogleSheetsService
 */

import { GoogleSheetsService } from '../../../src/services/sheets.js';
import { GoogleAuthService } from '../../../src/services/auth.js';
import { ValidationError, SheetsError } from '../../../src/utils/errors.js';
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

    mockAuthService = {
      ensureAuthenticated: jest.fn(),
      getSheetsClient: jest.fn(),
      getDriveClient: jest.fn(),
    } as any;

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
              ]
            }
          })
        }
      } as any);
    });

    it('should find sheets successfully', async () => {
      const result = await sheetsService.findSheets({ maxResults: 10 });
      expect(mockAuthService.ensureAuthenticated).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('sheet1');
    });

    it('should escape single quotes in query to prevent injection', async () => {
      const mockList = jest.fn().mockResolvedValue({ data: { files: [] } });
      mockAuthService.getDriveClient.mockReturnValue({ files: { list: mockList } } as any);

      await sheetsService.findSheets({ query: "test' OR 1=1 --", maxResults: 10 });

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.stringContaining("test\\' OR 1=1 --"),
        })
      );
    });

    it('should handle API errors', async () => {
      mockAuthService.getDriveClient.mockReturnValue({
        files: { list: jest.fn().mockRejectedValue({ code: 500, message: 'Server Error' }) }
      } as any);

      await expect(sheetsService.findSheets({ maxResults: 10 })).rejects.toThrow(SheetsError);
    });
  });

  describe('getSheetData', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: { values: [['Header 1'], ['Value 1']] }
            })
          },
          get: jest.fn().mockResolvedValue({
            data: { sheets: [{ properties: { title: 'Test Sheet' } }] }
          })
        }
      } as any);
    });

    it('should get sheet data successfully', async () => {
      const result = await sheetsService.getSheetData('test-sheet-id', 'A1:B2');
      expect(result.sheetId).toBe('test-sheet-id');
      expect(result.range).toBe('A1:B2');
    });

    it('should use default range', async () => {
      const result = await sheetsService.getSheetData('test-sheet-id');
      expect(result.range).toBe('A1:Z1000');
    });

    it('should throw ValidationError for empty sheet ID', async () => {
      await expect(sheetsService.getSheetData('')).rejects.toThrow(ValidationError);
      await expect(sheetsService.getSheetData('   ')).rejects.toThrow(ValidationError);
    });

    it('should handle 404 error', async () => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          values: { get: jest.fn().mockRejectedValue({ code: 404 }) },
          get: jest.fn(),
        }
      } as any);

      await expect(sheetsService.getSheetData('nonexistent')).rejects.toThrow();
    });
  });

  describe('createSheet', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          create: jest.fn().mockResolvedValue({
            data: {
              spreadsheetId: 'new-sheet-id',
              properties: { title: 'New Sheet' },
              spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-sheet-id'
            }
          })
        }
      } as any);
    });

    it('should create sheet successfully', async () => {
      const result = await sheetsService.createSheet({ title: 'New Sheet' });
      expect(result.id).toBe('new-sheet-id');
    });

    it('should create sheet with custom tabs', async () => {
      await sheetsService.createSheet({
        title: 'Custom',
        sheets: [{ name: 'Tab1', rowCount: 500, columnCount: 10 }]
      });

      const mockCreate = mockAuthService.getSheetsClient().spreadsheets.create as jest.Mock;
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            sheets: [expect.objectContaining({
              properties: expect.objectContaining({ title: 'Tab1' })
            })]
          })
        })
      );
    });
  });

  describe('updateSheet', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { values: { update: jest.fn().mockResolvedValue({ data: {} }) } }
      } as any);
    });

    it('should update with RAW by default', async () => {
      await sheetsService.updateSheet({ sheetId: 'x', range: 'A1', values: [['1']], majorDimension: 'ROWS' });
      const mockUpdate = mockAuthService.getSheetsClient().spreadsheets.values.update as jest.Mock;
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ valueInputOption: 'RAW' }));
    });

    it('should support USER_ENTERED value input option', async () => {
      await sheetsService.updateSheet({ sheetId: 'x', range: 'A1', values: [['=SUM(B1:B10)']], majorDimension: 'ROWS', valueInputOption: 'USER_ENTERED' });
      const mockUpdate = mockAuthService.getSheetsClient().spreadsheets.values.update as jest.Mock;
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ valueInputOption: 'USER_ENTERED' }));
    });
  });

  describe('deleteSheet', () => {
    beforeEach(() => {
      mockAuthService.getDriveClient.mockReturnValue({
        files: { update: jest.fn().mockResolvedValue({ data: {} }) }
      } as any);
    });

    it('should trash sheet instead of permanent delete', async () => {
      await sheetsService.deleteSheet('test-sheet-id');
      const mockUpdate = mockAuthService.getDriveClient().files.update as jest.Mock;
      expect(mockUpdate).toHaveBeenCalledWith({
        fileId: 'test-sheet-id',
        requestBody: { trashed: true },
      });
    });
  });

  describe('appendValues', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { values: { append: jest.fn().mockResolvedValue({ data: {} }) } }
      } as any);
    });

    it('should append values', async () => {
      await sheetsService.appendValues({ sheetId: 'x', range: 'A:A', values: [['new row']] });
      const mockAppend = mockAuthService.getSheetsClient().spreadsheets.values.append as jest.Mock;
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
        spreadsheetId: 'x',
        range: 'A:A',
        valueInputOption: 'RAW',
      }));
    });
  });

  describe('clearRange', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { values: { clear: jest.fn().mockResolvedValue({ data: {} }) } }
      } as any);
    });

    it('should clear range', async () => {
      await sheetsService.clearRange('x', 'A1:B2');
      const mockClear = mockAuthService.getSheetsClient().spreadsheets.values.clear as jest.Mock;
      expect(mockClear).toHaveBeenCalledWith({ spreadsheetId: 'x', range: 'A1:B2' });
    });
  });

  describe('batchGet', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          values: {
            batchGet: jest.fn().mockResolvedValue({
              data: {
                valueRanges: [
                  { range: 'A1:B2', values: [['a', 'b']] },
                  { range: 'C1:D2', values: [['c', 'd']] },
                ]
              }
            })
          }
        }
      } as any);
    });

    it('should batch get multiple ranges', async () => {
      const result = await sheetsService.batchGet('x', ['A1:B2', 'C1:D2']);
      expect(result['A1:B2']).toEqual([['a', 'b']]);
      expect(result['C1:D2']).toEqual([['c', 'd']]);
    });
  });

  describe('batchUpdate', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { values: { batchUpdate: jest.fn().mockResolvedValue({ data: {} }) } }
      } as any);
    });

    it('should batch update', async () => {
      await sheetsService.batchUpdate({
        sheetId: 'x',
        data: [{ range: 'A1', values: [['v']] }],
      });
      const mockBatchUpdate = mockAuthService.getSheetsClient().spreadsheets.values.batchUpdate as jest.Mock;
      expect(mockBatchUpdate).toHaveBeenCalled();
    });
  });

  describe('getSpreadsheetInfo', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          get: jest.fn().mockResolvedValue({
            data: {
              spreadsheetId: 'x',
              properties: { title: 'Test', locale: 'en', timeZone: 'UTC' },
              spreadsheetUrl: 'https://...',
              sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 100, columnCount: 26 } } }],
              namedRanges: [],
            }
          })
        }
      } as any);
    });

    it('should return spreadsheet info', async () => {
      const info = await sheetsService.getSpreadsheetInfo('x');
      expect(info['title']).toBe('Test');
      expect((info['sheets'] as any[]).length).toBe(1);
    });

    it('should throw for empty sheetId', async () => {
      await expect(sheetsService.getSpreadsheetInfo('')).rejects.toThrow(ValidationError);
    });
  });

  describe('addSheetTab', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: {
          batchUpdate: jest.fn().mockResolvedValue({
            data: { replies: [{ addSheet: { properties: { sheetId: 1, title: 'NewTab' } } }] }
          })
        }
      } as any);
    });

    it('should add a sheet tab', async () => {
      const result = await sheetsService.addSheetTab({ sheetId: 'x', title: 'NewTab' });
      expect(result.title).toBe('NewTab');
      expect(result.sheetId).toBe(1);
    });
  });

  describe('deleteSheetTab', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { batchUpdate: jest.fn().mockResolvedValue({ data: {} }) }
      } as any);
    });

    it('should delete a sheet tab', async () => {
      await sheetsService.deleteSheetTab('x', 0);
      const mock = mockAuthService.getSheetsClient().spreadsheets.batchUpdate as jest.Mock;
      expect(mock).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: { requests: [{ deleteSheet: { sheetId: 0 } }] }
      }));
    });
  });

  describe('renameSheetTab', () => {
    beforeEach(() => {
      mockAuthService.getSheetsClient.mockReturnValue({
        spreadsheets: { batchUpdate: jest.fn().mockResolvedValue({ data: {} }) }
      } as any);
    });

    it('should rename a sheet tab', async () => {
      await sheetsService.renameSheetTab('x', 0, 'Renamed');
      const mock = mockAuthService.getSheetsClient().spreadsheets.batchUpdate as jest.Mock;
      expect(mock).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: 0, title: 'Renamed' },
              fields: 'title',
            }
          }]
        }
      }));
    });
  });
});
