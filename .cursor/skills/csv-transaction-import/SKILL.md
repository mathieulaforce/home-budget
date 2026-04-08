---
name: csv-transaction-import
description: Parse and normalize bank CSV/Excel exports into the app's transaction data model. Use when building or modifying the import feature, adding support for new bank formats, or handling transaction deduplication.
---

# CSV Transaction Import

## Overview

Bank exports come in wildly different formats. This skill standardizes parsing, field mapping, deduplication, and auto-categorization.

## Import Pipeline

```
Upload → Detect Format → Parse Rows → Normalize → Deduplicate → Auto-Categorize → Preview → Save
```

1. **Upload**: User selects a CSV or XLSX file and the target Account
2. **Detect Format**: Match file columns against known bank format profiles
3. **Parse Rows**: Extract raw rows using `papaparse` (CSV) or `xlsx` / `sheetjs` (Excel)
4. **Normalize**: Map bank-specific columns to the standard `Transaction` shape
5. **Deduplicate**: Compute `import_hash` and filter out existing transactions
6. **Auto-Categorize**: Apply regex rules to assign categories
7. **Preview**: Show the user what will be imported with ability to edit categories
8. **Save**: Bulk insert into `transactions` table

## Libraries

| Task | Library | Why |
|------|---------|-----|
| CSV parsing | `papaparse` | Handles encoding, delimiters, quoted fields |
| Excel parsing | `xlsx` (SheetJS CE) | Reads .xlsx/.xls without server-side Office |

## Normalized Transaction Shape

Before saving, every row must be mapped to:

```typescript
interface ImportedRow {
  date: Date;
  description: string;
  amount: number;       // cents, positive = income, negative = expense
  importHash: string;   // SHA-256(date|amount|description)
  categoryId?: number;  // from auto-categorization, nullable
}
```

## Column Mapping Strategy

Each bank format is defined as a profile in `src/lib/import/formats.ts`:

```typescript
interface BankFormat {
  id: string;                    // e.g. "ing-be", "kbc-be"
  name: string;                  // "ING Belgium"
  dateColumn: string;            // header name for date
  dateFormat: string;            // e.g. "DD/MM/YYYY", "YYYY-MM-DD"
  descriptionColumns: string[];  // headers to concatenate for description
  amountColumn?: string;         // single signed amount column
  debitColumn?: string;          // separate debit column (always positive)
  creditColumn?: string;         // separate credit column (always positive)
  delimiter?: string;            // default ","
  skipRows?: number;             // header rows to skip
  encoding?: string;             // default "utf-8"
}
```

**Amount handling**: Banks use one of two conventions:
- **Single column**: positive = credit, negative = debit (most common)
- **Two columns**: separate debit and credit columns (both positive values). Convert debit to negative.

For known bank format mappings, see [bank-formats.md](bank-formats.md).

## Deduplication

Compute a hash for each row to prevent re-importing the same transaction:

```typescript
import { createHash } from "crypto";

function computeImportHash(date: string, amount: number, description: string): string {
  const raw = `${date}|${amount}|${description}`;
  return createHash("sha256").update(raw).digest("hex");
}
```

Before inserting, query existing hashes for the target account:

```typescript
const existing = await db
  .select({ hash: transactions.importHash })
  .from(transactions)
  .where(eq(transactions.accountId, accountId));

const existingSet = new Set(existing.map((r) => r.hash));
const newRows = parsed.filter((r) => !existingSet.has(r.importHash));
```

## Auto-Categorization

Define rules as patterns matched against the transaction description:

```typescript
interface CategoryRule {
  categoryId: number;
  patterns: RegExp[];
}

// Example rules
const rules: CategoryRule[] = [
  { categoryId: 1, patterns: [/colruyt/i, /delhaize/i, /aldi/i, /lidl/i, /carrefour/i] },
  { categoryId: 5, patterns: [/netflix/i, /spotify/i, /disney/i] },
  { categoryId: 3, patterns: [/q8/i, /total ?energies/i, /shell/i] },
];
```

- Match **first** rule that hits (order matters)
- Unmatched transactions get `categoryId: null` (user categorizes manually)
- Store rules in DB later for user-customizable categorization

## Error Handling

- **Empty file**: reject with clear message
- **Missing required columns**: show which columns were expected vs found
- **Unparseable date**: skip row, collect in `errors[]` array for user review
- **Unparseable amount**: skip row, collect in `errors[]`
- **All rows duplicates**: show "0 new transactions found" with explanation

## Validation with Zod

```typescript
const importRowSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1),
  amount: z.number().int(),
  importHash: z.string().length(64),
  categoryId: z.number().int().nullable().optional(),
});
```
