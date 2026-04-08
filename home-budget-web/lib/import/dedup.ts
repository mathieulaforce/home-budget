import { createHash } from "crypto";
import type { ImportedRow } from "@/lib/domain/import/types";

export function normalizeDescription(desc: string): string {
  return desc.trim().replace(/\s+/g, " ");
}

export function computeImportHash(
  accountId: number,
  date: Date,
  amount: number,
  description: string
): string {
  const dateISO = date.toISOString().split("T")[0];
  const normalized = normalizeDescription(description);
  const raw = `${accountId}|${dateISO}|${amount}|${normalized}`;
  return createHash("sha256").update(raw).digest("hex");
}

export function filterDuplicates(
  rows: ImportedRow[],
  existingHashes: Set<string>
): { newRows: ImportedRow[]; duplicates: ImportedRow[] } {
  const newRows: ImportedRow[] = [];
  const duplicates: ImportedRow[] = [];
  const seenInBatch = new Set<string>();

  for (const row of rows) {
    if (existingHashes.has(row.importHash) || seenInBatch.has(row.importHash)) {
      duplicates.push(row);
    } else {
      newRows.push(row);
      seenInBatch.add(row.importHash);
    }
  }

  return { newRows, duplicates };
}
