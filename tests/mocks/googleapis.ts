/**
 * Mock implementations for Google APIs
 */

export const mockGoogleAuth = {
  OAuth2: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    credentials: {},
    getAccessToken: jest.fn(),
    refreshAccessToken: jest.fn().mockResolvedValue({
      credentials: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600000,
      }
    }),
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?mock=true'),
    getToken: jest.fn().mockResolvedValue({
      tokens: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600000,
      }
    }),
  })),
};

export const mockGoogleSheets = {
  spreadsheets: {
    get: jest.fn().mockResolvedValue({
      data: {
        spreadsheetId: 'mock-sheet-id',
        properties: {
          title: 'Mock Sheet',
          locale: 'en_US',
          timeZone: 'America/New_York',
        },
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/mock-sheet-id',
        sheets: [{
          properties: {
            title: 'Sheet1',
            sheetId: 0,
            index: 0,
            gridProperties: { rowCount: 1000, columnCount: 26 },
          }
        }],
        namedRanges: [],
      }
    }),
    create: jest.fn().mockResolvedValue({
      data: {
        spreadsheetId: 'new-mock-sheet-id',
        properties: {
          title: 'New Mock Sheet',
        },
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-mock-sheet-id'
      }
    }),
    batchUpdate: jest.fn().mockResolvedValue({
      data: {
        replies: [{
          addSheet: {
            properties: {
              sheetId: 1,
              title: 'New Tab',
              index: 1,
            }
          }
        }],
      }
    }),
    values: {
      get: jest.fn().mockResolvedValue({
        data: {
          range: 'A1:C3',
          majorDimension: 'ROWS',
          values: [
            ['Header 1', 'Header 2', 'Header 3'],
            ['Value 1', 'Value 2', 'Value 3'],
            ['Value 4', 'Value 5', 'Value 6'],
          ]
        }
      }),
      update: jest.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'mock-sheet-id',
          updatedRange: 'A1:C3',
          updatedRows: 3,
          updatedColumns: 3,
          updatedCells: 9,
        }
      }),
      append: jest.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'mock-sheet-id',
          updates: { updatedRows: 1 },
        }
      }),
      clear: jest.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'mock-sheet-id',
          clearedRange: 'A1:C3',
        }
      }),
      batchGet: jest.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'mock-sheet-id',
          valueRanges: [
            { range: 'A1:B2', values: [['a', 'b'], ['c', 'd']] },
            { range: 'C1:D2', values: [['e', 'f'], ['g', 'h']] },
          ],
        }
      }),
      batchUpdate: jest.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'mock-sheet-id',
          totalUpdatedRows: 2,
          totalUpdatedColumns: 2,
          totalUpdatedCells: 4,
        }
      }),
    }
  }
};

export const mockGoogleDrive = {
  files: {
    list: jest.fn().mockResolvedValue({
      data: {
        files: [
          {
            id: 'mock-sheet-id-1',
            name: 'Test Sheet 1',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            webViewLink: 'https://docs.google.com/spreadsheets/d/mock-sheet-id-1',
            createdTime: '2023-01-01T00:00:00.000Z',
            modifiedTime: '2023-01-02T00:00:00.000Z',
            owners: [{ displayName: 'Test User' }],
          },
          {
            id: 'mock-sheet-id-2',
            name: 'Test Sheet 2',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            webViewLink: 'https://docs.google.com/spreadsheets/d/mock-sheet-id-2',
            createdTime: '2023-01-03T00:00:00.000Z',
            modifiedTime: '2023-01-04T00:00:00.000Z',
            owners: [{ displayName: 'Test User' }],
          }
        ]
      }
    }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    update: jest.fn().mockResolvedValue({ data: {} }),
  }
};

// Mock the googleapis module
jest.mock('googleapis', () => ({
  google: {
    auth: mockGoogleAuth,
    sheets: jest.fn(() => mockGoogleSheets),
    drive: jest.fn(() => mockGoogleDrive),
  }
}));
