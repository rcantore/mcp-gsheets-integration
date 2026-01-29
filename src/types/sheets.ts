import { z } from 'zod';

export const SheetMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  createdTime: z.string(),
  modifiedTime: z.string(),
  owner: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const SheetDataSchema = z.object({
  sheetId: z.string(),
  sheetName: z.string().optional(),
  range: z.string().optional(),
  values: z.array(z.array(z.string())),
});

export const CreateSheetRequestSchema = z.object({
  title: z.string().min(1),
  sheets: z.array(z.object({
    name: z.string().min(1),
    rowCount: z.number().min(1).max(10_000_000).optional().default(1000),
    columnCount: z.number().min(1).max(18_278).optional().default(26),
  })).optional(),
});

export const UpdateSheetRequestSchema = z.object({
  sheetId: z.string().min(1),
  range: z.string().min(1),
  values: z.array(z.array(z.string())),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS'),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('RAW'),
});

export const FindSheetsRequestSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().min(1).max(100).optional().default(10),
  orderBy: z.enum(['name', 'createdTime', 'modifiedTime']).optional().default('modifiedTime'),
});

export const GetSheetDataRequestSchema = z.object({
  sheetId: z.string().min(1),
  range: z.string().optional(),
});

export const DeleteSheetRequestSchema = z.object({
  sheetId: z.string().min(1),
});

export const AppendValuesRequestSchema = z.object({
  sheetId: z.string().min(1),
  range: z.string().min(1),
  values: z.array(z.array(z.string())),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('RAW'),
});

export const ClearRangeRequestSchema = z.object({
  sheetId: z.string().min(1),
  range: z.string().min(1),
});

export const BatchGetRequestSchema = z.object({
  sheetId: z.string().min(1),
  ranges: z.array(z.string().min(1)).min(1),
});

export const BatchUpdateRequestSchema = z.object({
  sheetId: z.string().min(1),
  data: z.array(z.object({
    range: z.string().min(1),
    values: z.array(z.array(z.string())),
  })).min(1),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('RAW'),
});

export const GetSpreadsheetInfoRequestSchema = z.object({
  sheetId: z.string().min(1),
});

export const AddSheetTabRequestSchema = z.object({
  sheetId: z.string().min(1),
  title: z.string().min(1),
  rowCount: z.number().min(1).max(10_000_000).optional(),
  columnCount: z.number().min(1).max(18_278).optional(),
});

export const DeleteSheetTabRequestSchema = z.object({
  sheetId: z.string().min(1),
  tabId: z.number().int().min(0),
});

export const RenameSheetTabRequestSchema = z.object({
  sheetId: z.string().min(1),
  tabId: z.number().int().min(0),
  newTitle: z.string().min(1),
});

export type SheetMetadata = z.infer<typeof SheetMetadataSchema>;
export type SheetData = z.infer<typeof SheetDataSchema>;
export type CreateSheetRequest = z.infer<typeof CreateSheetRequestSchema>;
export type UpdateSheetRequest = z.infer<typeof UpdateSheetRequestSchema>;
export type FindSheetsRequest = z.infer<typeof FindSheetsRequestSchema>;
export type GetSheetDataRequest = z.infer<typeof GetSheetDataRequestSchema>;
export type DeleteSheetRequest = z.infer<typeof DeleteSheetRequestSchema>;
export type AppendValuesRequest = z.infer<typeof AppendValuesRequestSchema>;
export type ClearRangeRequest = z.infer<typeof ClearRangeRequestSchema>;
export type BatchGetRequest = z.infer<typeof BatchGetRequestSchema>;
export type BatchUpdateRequest = z.infer<typeof BatchUpdateRequestSchema>;
export type GetSpreadsheetInfoRequest = z.infer<typeof GetSpreadsheetInfoRequestSchema>;
export type AddSheetTabRequest = z.infer<typeof AddSheetTabRequestSchema>;
export type DeleteSheetTabRequest = z.infer<typeof DeleteSheetTabRequestSchema>;
export type RenameSheetTabRequest = z.infer<typeof RenameSheetTabRequestSchema>;
