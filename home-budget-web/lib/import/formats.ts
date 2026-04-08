import type { BankFormat } from "@/lib/domain/import/types";

export const BANK_FORMATS: BankFormat[] = [
  {
    id: "ing-be",
    name: "ING Belgium",
    delimiter: ";",
    dateColumn: "Datum",
    dateFormat: "DD/MM/YYYY",
    descriptionColumns: ["Naam / Omschrijving", "Mededelingen"],
    amountColumn: "Bedrag (EUR)",
  },
  {
    id: "kbc-be",
    name: "KBC Belgium",
    delimiter: ";",
    dateColumn: "Datum",
    dateFormat: "DD/MM/YYYY",
    descriptionColumns: ["Omschrijving", "Mededeling"],
    amountColumn: "Bedrag",
  },
  {
    id: "belfius-be",
    name: "Belfius",
    delimiter: ";",
    dateColumn: "Datum",
    dateFormat: "DD/MM/YYYY",
    descriptionColumns: ["Beschrijving"],
    amountColumn: "Bedrag",
  },
  {
    id: "argenta-be",
    name: "Argenta",
    delimiter: ";",
    dateColumn: "Boekingsdatum",
    dateFormat: "DD-MM-YYYY",
    descriptionColumns: ["Beschrijving"],
    debitColumn: "Debet",
    creditColumn: "Credit",
  },
];

export interface DetectedFormat {
  format: BankFormat;
  headerMap: Map<string, string>;
}

export function detectFormat(headers: string[]): DetectedFormat | null {
  const trimmed = headers.map((h) => h.trim());
  const lowerToOriginal = new Map(trimmed.map((h) => [h.toLowerCase(), h]));

  for (const format of BANK_FORMATS) {
    const requiredColumns = [
      format.dateColumn,
      ...format.descriptionColumns,
      ...(format.amountColumn ? [format.amountColumn] : []),
      ...(format.debitColumn ? [format.debitColumn] : []),
      ...(format.creditColumn ? [format.creditColumn] : []),
    ];

    const headerMap = new Map<string, string>();
    const allFound = requiredColumns.every((col) => {
      const original = lowerToOriginal.get(col.toLowerCase());
      if (original !== undefined) {
        headerMap.set(col, original);
        return true;
      }
      return false;
    });

    if (allFound) {
      return { format, headerMap };
    }
  }

  return null;
}
