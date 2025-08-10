/**
 * Mock implementations for Google APIs
 */

export const mockGoogleAuth = {
  OAuth2: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
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
        },
        sheets: [{
          properties: {
            title: 'Sheet1',
            sheetId: 0,
          }
        }]
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
            createdTime: '2023-01-01T00:00:00.000Z',
            modifiedTime: '2023-01-02T00:00:00.000Z',
          },
          {
            id: 'mock-sheet-id-2', 
            name: 'Test Sheet 2',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            createdTime: '2023-01-03T00:00:00.000Z',
            modifiedTime: '2023-01-04T00:00:00.000Z',
          }
        ]
      }
    }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
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