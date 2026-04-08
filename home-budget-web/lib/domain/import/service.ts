import type {
  BankFormat,
  ImportedRow,
  ImportPreviewResult,
  ParseError,
  PreviewRow,
  RawParsedFile,
} from "./types";
import { parseEuropeanAmount, parseDate } from "@/lib/import/parser";
import { normalizeDescription, computeImportHash } from "@/lib/import/dedup";
import { categorizeRow } from "@/lib/import/categorize";

interface CategoryRule {
  categoryId: number;
  patterns: RegExp[];
}

interface BuildPreviewInput {
  parsed: RawParsedFile;
  format: BankFormat;
  accountId: number;
  existingHashes: Set<string>;
  categoryRules: CategoryRule[];
  headerMap: Map<string, string>;
}

function getColumn(
  raw: Record<string, string>,
  formatCol: string,
  headerMap: Map<string, string>
): string | undefined {
  const actualHeader = headerMap.get(formatCol) ?? formatCol;
  return raw[actualHeader];
}

export function buildImportPreview(
  input: BuildPreviewInput
): ImportPreviewResult {
  const { parsed, format, accountId, existingHashes, categoryRules, headerMap } =
    input;

  const validRows: ImportedRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const raw = parsed.rows[i];
    const sourceRowIndex = i + 1;

    try {
      const dateStr = getColumn(raw, format.dateColumn, headerMap)?.trim();
      if (!dateStr) {
        errors.push({
          rowIndex: sourceRowIndex,
          code: "MISSING_COLUMN",
          message: `Missing date in column "${format.dateColumn}"`,
        });
        continue;
      }

      const date = parseDate(dateStr, format.dateFormat);

      let amount: number;
      if (format.amountColumn) {
        const amountStr = getColumn(raw, format.amountColumn, headerMap)?.trim();
        if (!amountStr) {
          errors.push({
            rowIndex: sourceRowIndex,
            code: "INVALID_AMOUNT",
            message: `Missing amount in column "${format.amountColumn}"`,
          });
          continue;
        }
        amount = parseEuropeanAmount(amountStr);
      } else if (format.debitColumn && format.creditColumn) {
        const debitStr = getColumn(raw, format.debitColumn, headerMap)?.trim();
        const creditStr = getColumn(raw, format.creditColumn, headerMap)?.trim();
        if (!debitStr && !creditStr) {
          errors.push({
            rowIndex: sourceRowIndex,
            code: "INVALID_AMOUNT",
            message: "Both debit and credit columns are empty",
          });
          continue;
        }
        const debit = debitStr ? parseEuropeanAmount(debitStr) : 0;
        const credit = creditStr ? parseEuropeanAmount(creditStr) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      } else {
        errors.push({
          rowIndex: sourceRowIndex,
          code: "MISSING_COLUMN",
          message: "No amount column configured",
        });
        continue;
      }

      const descParts = format.descriptionColumns
        .map((col) => getColumn(raw, col, headerMap)?.trim())
        .filter(Boolean);

      if (descParts.length === 0) {
        errors.push({
          rowIndex: sourceRowIndex,
          code: "EMPTY_ROW",
          message: "No description found",
        });
        continue;
      }

      const description = normalizeDescription(descParts.join(" - "));
      const importHash = computeImportHash(accountId, date, amount, description);
      const categoryId = categorizeRow(description, categoryRules);

      validRows.push({ date, description, amount, importHash, categoryId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown parsing error";
      const code = message.includes("amount") ? "INVALID_AMOUNT" : "INVALID_DATE";
      errors.push({ rowIndex: sourceRowIndex, code, message });
    }
  }

  const seenInBatch = new Set<string>();
  const previewRows: PreviewRow[] = validRows.map((row, idx) => {
    const isDuplicate =
      existingHashes.has(row.importHash) || seenInBatch.has(row.importHash);

    seenInBatch.add(row.importHash);

    return {
      ...row,
      rowKey: `${idx}-${row.importHash.slice(0, 8)}`,
      sourceRowIndex: idx,
      included: !isDuplicate,
      isDuplicate,
    };
  });

  const duplicates = previewRows.filter((r) => r.isDuplicate).length;

  return {
    format,
    rows: previewRows,
    errors,
    stats: {
      totalParsed: parsed.rows.length,
      valid: validRows.length,
      duplicates,
      errors: errors.length,
    },
  };
}
