import { FieldDefinition } from '@/types/fields';

export interface DocumentHistoryEntry {
  id: number;
  fileName: string;
  fileSize: number;
  pageCount: number;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
  fieldsJson: string;
  pdfHash?: string;
}

export interface DocumentHistoryInput {
  fileName: string;
  fileSize: number;
  pageCount: number;
  fieldCount: number;
  fields: FieldDefinition[];
  pdfHash?: string;
}
