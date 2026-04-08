import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawParsedFile } from "@/lib/domain/import/types";

export function parseEuropeanAmount(value: string): number {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) throw new Error("Empty amount");

  // European format: 1.234,56 → remove period separators, replace comma with dot
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const float = parseFloat(normalized);
  if (isNaN(float)) throw new Error(`Invalid amount: "${value}"`);

  return Math.round(float * 100);
}

export function parseDate(value: string, format: string): Date {
  const trimmed = value.trim();

  let day: number, month: number, year: number;

  switch (format) {
    case "DD/MM/YYYY": {
      const parts = trimmed.split("/");
      if (parts.length !== 3) throw new Error(`Invalid date: "${value}"`);
      [day, month, year] = parts.map(Number);
      break;
    }
    case "DD-MM-YYYY": {
      const parts = trimmed.split("-");
      if (parts.length !== 3) throw new Error(`Invalid date: "${value}"`);
      [day, month, year] = parts.map(Number);
      break;
    }
    case "YYYY-MM-DD": {
      const parts = trimmed.split("-");
      if (parts.length !== 3) throw new Error(`Invalid date: "${value}"`);
      [year, month, day] = parts.map(Number);
      break;
    }
    default:
      throw new Error(`Unsupported date format: "${format}"`);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date: "${value}"`);
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: "${value}"`);
  }

  return date;
}

export function parseFile(
  buffer: Buffer,
  fileName: string
): RawParsedFile {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "xlsx" || ext === "xls") {
    return parseExcel(buffer);
  }

  return parseCsv(buffer);
}

function parseCsv(buffer: Buffer): RawParsedFile {
  const text = buffer.toString("utf-8");

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (!result.meta.fields || result.meta.fields.length === 0) {
    throw new Error("CSV file has no headers");
  }

  return {
    headers: result.meta.fields,
    rows: result.data,
  };
}

function parseExcel(buffer: Buffer): RawParsedFile {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });

  if (jsonRows.length === 0) throw new Error("Excel sheet is empty");

  const headers = Object.keys(jsonRows[0]);

  return { headers, rows: jsonRows };
}
