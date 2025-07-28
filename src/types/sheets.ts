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
  title: z.string(),
  sheets: z.array(z.object({
    name: z.string(),
    rowCount: z.number().optional().default(1000),
    columnCount: z.number().optional().default(26),
  })).optional(),
});

export const UpdateSheetRequestSchema = z.object({
  sheetId: z.string(),
  range: z.string(),
  values: z.array(z.array(z.string())),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS'),
});

export const FindSheetsRequestSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().optional().default(10),
  orderBy: z.enum(['name', 'createdTime', 'modifiedTime']).optional().default('modifiedTime'),
});

export type SheetMetadata = z.infer<typeof SheetMetadataSchema>;
export type SheetData = z.infer<typeof SheetDataSchema>;
export type CreateSheetRequest = z.infer<typeof CreateSheetRequestSchema>;
export type UpdateSheetRequest = z.infer<typeof UpdateSheetRequestSchema>;
export type FindSheetsRequest = z.infer<typeof FindSheetsRequestSchema>;