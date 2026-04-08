# M3: CSV Import -- Build Report

## Prerequisites

- M2 completed: transactions can be created and listed, categories exist
- `transactions` table has `import_hash` unique column for dedup

## Goal

Upload bank CSV/XLSX files, auto-detect format, parse, deduplicate, auto-categorize, preview, and bulk insert transactions.

---

## Task 1: Install Dependencies

```bash
npm install papaparse
npm install -D @types/papaparse
npm install xlsx
```

---

## Task 2: Bank Format Profiles

### `home-budget-web/lib/import/formats.ts`

Define the `BankFormat` interface and 4 Belgian bank profiles:

```typescript
export interface BankFormat {
  id: string;
  name: string;
  dateColumn: string;
  dateFormat: string;       // "DD/MM/YYYY" or "DD-MM-YYYY" or "YYYY-MM-DD"
  descriptionColumns: string[];
  amountColumn?: string;    // single signed column
  debitColumn?: string;     // separate debit (always positive)
  creditColumn?: string;    // separate credit (always positive)
  delimiter?: string;       // default ","
  skipRows?: number;
  encoding?: string;        // default "utf-8"
}
```

**Profiles** (from `.cursor/skills/csv-transaction-import/bank-formats.md`):

1. `ing-be`: delimiter `;`, dateColumn "Datum", dateFormat "DD/MM/YYYY", descriptionColumns ["Naam / Omschrijving", "Mededelingen"], amountColumn "Bedrag (EUR)". Note: comma decimal separator.
2. `kbc-be`: delimiter `;`, dateColumn "Datum", dateFormat "DD/MM/YYYY", descriptionColumns ["Omschrijving", "Mededeling"], amountColumn "Bedrag".
3. `belfius-be`: delimiter `;`, dateColumn "Datum", dateFormat "DD/MM/YYYY", descriptionColumns ["Beschrijving"], amountColumn "Bedrag".
4. `argenta-be`: delimiter `;`, dateColumn "Boekingsdatum", dateFormat "DD-MM-YYYY", descriptionColumns ["Beschrijving"], debitColumn "Debet", creditColumn "Credit". Separate debit/credit columns.

**`detectFormat(headers: string[]): BankFormat | null`** -- Match headers against known profiles. Return first match or null.

---

## Task 3: CSV/XLSX Parser

### `home-budget-web/lib/import/parser.ts`

**`parseFile(file: File, format: BankFormat): Promise<ParseResult>`**

```typescript
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface RawRow {
  date: string;
  description: string;
  amount: number; // cents, signed
}

interface ParseResult {
  rows: RawRow[];
  errors: ParseError[];
  totalRowCount: number;
}

interface ParseError {
  row: number;
  field: string;
  message: string;
  rawValue: string;
}
```

Logic:
1. Detect file type from extension (.csv vs .xlsx/.xls)
2. CSV: use `Papa.parse(file, { header: true, delimiter: format.delimiter, skipEmptyLines: true })`
3. XLSX: use `XLSX.read()` + `XLSX.utils.sheet_to_json()`
4. For each row:
   - Extract date string from `format.dateColumn`, parse to Date using `format.dateFormat`
   - Extract description by concatenating `format.descriptionColumns` values with " - "
   - Extract amount: if `format.amountColumn`, parse that column (handle comma decimal: `"1.234,56"` -> `-123456` cents). If `format.debitColumn`/`format.creditColumn`, parse both: debit becomes negative, credit becomes positive.
   - If date or amount fails to parse: add to `errors[]`, skip row
5. Return `{ rows, errors, totalRowCount }`

**Amount parsing helper:**

```typescript
function parseEuropeanAmount(value: string): number {
  // "1.234,56" -> 1234.56 -> 123456 cents
  // "-1.234,56" -> -123456 cents
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const float = parseFloat(cleaned);
  if (isNaN(float)) throw new Error(`Invalid amount: ${value}`);
  return Math.round(float * 100);
}
```

---

## Task 4: Deduplication

### `home-budget-web/lib/import/dedup.ts`

```typescript
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function computeImportHash(date: string, amount: number, description: string): string {
  const raw = `${date}|${amount}|${description}`;
  return createHash("sha256").update(raw).digest("hex");
}

export async function filterDuplicates(
  rows: ImportedRow[],
  accountId: number
): Promise<{ newRows: ImportedRow[]; duplicateCount: number }> {
  const existing = await db
    .select({ hash: transactions.importHash })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  const existingSet = new Set(existing.map((r) => r.hash));
  const newRows = rows.filter((r) => !existingSet.has(r.importHash));

  return { newRows, duplicateCount: rows.length - newRows.length };
}
```

---

## Task 5: Auto-Categorization

### `home-budget-web/lib/import/categorize.ts`

```typescript
interface CategoryRule {
  categoryId: number;
  patterns: RegExp[];
}

// Rules must be loaded from DB categories. Map category names to IDs at runtime.
// These are default pattern sets keyed by category name:
const defaultPatterns: Record<string, RegExp[]> = {
  "Groceries": [/colruyt/i, /delhaize/i, /aldi/i, /lidl/i, /carrefour/i, /albert heijn/i, /spar/i],
  "Restaurants": [/restaurant/i, /takeaway/i, /deliveroo/i, /uber ?eats/i, /just ?eat/i],
  "Subscriptions": [/netflix/i, /spotify/i, /disney/i, /apple\.com/i, /google storage/i],
  "Fuel": [/q8/i, /total ?energies/i, /shell/i, /esso/i, /lukoil/i],
  "Public Transit": [/nmbs/i, /sncb/i, /de lijn/i, /stib/i, /tec/i],
  "Salary": [/salaris/i, /loon/i, /salary/i, /wedde/i],
  "Utilities": [/electrabel/i, /engie/i, /luminus/i, /water\-link/i, /farys/i],
  "Rent/Mortgage": [/huur/i, /rent/i, /hypotheek/i, /mortgage/i],
};

export async function buildCategoryRules(): Promise<CategoryRule[]> {
  // Fetch categories from DB, match names to defaultPatterns
  const cats = await db.query.categories.findMany();
  return cats
    .filter((c) => defaultPatterns[c.name])
    .map((c) => ({ categoryId: c.id, patterns: defaultPatterns[c.name] }));
}

export function categorizeRow(description: string, rules: CategoryRule[]): number | null {
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(description))) {
      return rule.categoryId;
    }
  }
  return null;
}
```

---

## Task 6: Import Server Action

### `home-budget-web/lib/actions/import.ts`

Two-phase action:

**Phase 1: `processImportFile(formData: FormData)`**

Input: FormData with `file` (File), `accountId` (string).

Steps:
1. Read file, detect format (or return error if unknown)
2. Parse rows
3. Compute import hashes
4. Filter duplicates against DB
5. Auto-categorize
6. Return preview: `{ rows: ImportedRow[], duplicateCount, errorCount, errors[], formatName }`

**Phase 2: `confirmImport(rows: ImportedRow[], accountId: number)`**

Input: The confirmed rows (possibly with user-edited categories).

Steps:
1. Validate all rows with Zod
2. Bulk insert into `transactions` table
3. Return `{ insertedCount }`

---

## Task 7: Import Stepper Component

### `home-budget-web/components/import/ImportStepper.tsx`

`"use client"` component. Three-step flow:

**Step 1: Upload**
- File drop zone (drag & drop + click to browse)
- Account selector (shadcn `Select`, populated from `useAccounts()`)
- "Upload & Preview" button
- On submit: call `processImportFile` server action
- Show loading spinner during processing

**Step 2: Preview**
- Summary bar: "X new transactions, Y duplicates skipped, Z errors"
- If errors: expandable error list showing row number + field + message
- `<ImportPreview />` table (Task 8)
- "Confirm Import" and "Cancel" buttons

**Step 3: Confirm**
- Success message: "Imported X transactions into [Account Name]"
- "View Transactions" button (links to transaction list filtered by account)
- "Import More" button (resets to step 1)

---

## Task 8: Import Preview Table

### `home-budget-web/components/import/ImportPreview.tsx`

`"use client"` component using **TanStack Table** + **TanStack Virtual**.

**Columns:**

| Column | Content | Editable |
|--------|---------|----------|
| Checkbox | Row selection (include/exclude) | Yes |
| Date | Formatted date | No |
| Description | Raw description text | No |
| Amount | Formatted, color-coded | No |
| Category | Combobox dropdown | Yes -- user can change auto-assigned category |
| Status | Badge: "New" (green), "Auto-categorized" (blue), "Uncategorized" (amber) | No |

**Virtualization:** Use `@tanstack/react-virtual` for the table body. Render only visible rows. This handles files with 1000+ transactions.

**Row selection:** Checkbox column for bulk include/exclude. Selected rows (checked) will be imported. Default: all checked.

**Inline category editing:** Click the category cell to open a combobox (shadcn `Command` in a `Popover`). Changing a category updates the local state only (not saved until confirm).

---

## Task 9: Import Page

### `home-budget-web/app/(dashboard)/transactions/import/page.tsx`

- Page title: "Import Transactions"
- Renders `<ImportStepper />`

---

## Acceptance Criteria

1. Can upload a CSV file and auto-detect bank format (ING, KBC, Belfius, Argenta)
2. Shows clear error if format is unrecognized
3. Preview shows all parsed transactions with auto-categorized badges
4. Duplicate transactions are identified and excluded automatically, count shown
5. Parse errors (bad dates, bad amounts) are listed with row numbers
6. Can edit categories inline in the preview table
7. Can deselect rows to exclude them from import
8. Preview table handles 1000+ rows smoothly (virtualization)
9. Confirming import bulk inserts all selected rows
10. After import, can navigate to transaction list and see imported transactions
11. Re-importing the same file shows "0 new transactions" (dedup works)

## Files Created

```
home-budget-web/
├── lib/import/
│   ├── formats.ts
│   ├── parser.ts
│   ├── dedup.ts
│   └── categorize.ts
├── lib/actions/import.ts
├── components/import/
│   ├── ImportStepper.tsx
│   └── ImportPreview.tsx
└── app/(dashboard)/transactions/import/page.tsx
```
