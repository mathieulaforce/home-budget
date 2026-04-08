export interface BankFormat {
  id: string;
  name: string;
  dateColumn: string;
  dateFormat: string;
  descriptionColumns: string[];
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  delimiter?: string;
  skipRows?: number;
}

export interface ImportedRow {
  date: Date;
  description: string;
  amount: number;
  importHash: string;
  categoryId: number | null;
}

export interface ParseError {
  rowIndex: number;
  code: "INVALID_DATE" | "INVALID_AMOUNT" | "MISSING_COLUMN" | "EMPTY_ROW";
  message: string;
}

export interface PreviewRow extends ImportedRow {
  rowKey: string;
  sourceRowIndex: number;
  included: boolean;
  isDuplicate: boolean;
}

export interface ImportPreviewResult {
  format: BankFormat;
  rows: PreviewRow[];
  errors: ParseError[];
  stats: {
    totalParsed: number;
    valid: number;
    duplicates: number;
    errors: number;
  };
}

export interface RawParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}
