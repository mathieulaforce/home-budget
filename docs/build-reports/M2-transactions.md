# M2: Transactions -- Build Report

## Prerequisites

- M0 + M1 completed: accounts exist, can be queried
- `transactions` and `categories` tables exist and categories are seeded
- shadcn components available: `table`, `button`, `input`, `select`, `badge`, `dialog`

## Goal

Browse, filter, sort, and paginate transactions. Manually create/edit/delete transactions. Assign categories.

---

## Task 1: Additional shadcn Components

```bash
npx shadcn@latest add popover calendar command
```

These are needed for the date picker and category combobox.

---

## Task 2: Zod Schemas

### `home-budget-web/lib/validators/transactions.ts`

```typescript
import { z } from "zod";

export const createTransactionSchema = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  date: z.coerce.date(),
  description: z.string().min(1).max(500),
  amount: z.number().int(), // cents, positive = income, negative = expense
  notes: z.string().max(500).nullable().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFiltersSchema = z.object({
  accountId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
```

---

## Task 3: Query Functions

### `home-budget-web/lib/queries/transactions.ts`

**`getTransactions(filters: TransactionFilters)`**

Returns `{ data: Transaction[], total: number, page: number, pageSize: number }`.

Query logic:
1. Build WHERE clauses from filters: `accountId`, `categoryId`, date range (`date >= startDate AND date <= endDate`), description LIKE search
2. Apply ORDER BY from `sortBy` + `sortOrder`
3. Apply LIMIT/OFFSET from `page` + `pageSize`
4. Run a parallel COUNT query for total (pagination)
5. JOIN with `categories` table to include category name + groupName
6. JOIN with `accounts` table to include account name

**Response shape per row:**

```typescript
interface TransactionRow {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryGroup: string | null;
  date: Date;
  description: string;
  amount: number; // cents
  notes: string | null;
  importHash: string | null;
  createdAt: Date;
}
```

**`getCategories()`** -- Simple: return all categories ordered by sortOrder. Used for dropdowns.

---

## Task 4: Server Actions

### `home-budget-web/lib/actions/transactions.ts`

- `createTransaction(input)` -- Validate with Zod, insert, revalidate path
- `updateTransaction(id, input)` -- Validate, update, revalidate
- `deleteTransaction(id)` -- Hard delete (transactions don't soft-delete), revalidate
- `updateTransactionCategory(id, categoryId)` -- Quick category reassignment (used from table inline)

All return `{ success: true }` or `{ success: false, error }`.

---

## Task 5: API Routes

### `home-budget-web/app/api/transactions/route.ts`

| Method | Description | Request | Response |
|--------|------------|---------|----------|
| GET | List transactions with filters | Query params matching `transactionFiltersSchema` | `{ data: TransactionRow[], total, page, pageSize }` |
| POST | Create transaction | `CreateTransactionInput` JSON body | `{ data: { id: number } }` |

### `home-budget-web/app/api/transactions/[id]/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | Single transaction | `{ data: TransactionRow }` |
| PUT | Update transaction | `{ data: { success: true } }` |
| DELETE | Delete transaction | `{ data: { success: true } }` |

### `home-budget-web/app/api/categories/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | List all categories | `{ data: Category[] }` |

---

## Task 6: TanStack Query Hooks

### `home-budget-web/hooks/useTransactions.ts`

```typescript
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) => ["transactions", "list", filters] as const,
  detail: (id: number) => ["transactions", id] as const,
};

export function useTransactions(filters: TransactionFilters);
export function useTransaction(id: number);
export function useCreateTransaction();  // invalidates transactionKeys.all on success
export function useUpdateTransaction(id: number);
export function useDeleteTransaction();
export function useUpdateTransactionCategory(); // optimistic update for inline category change
```

### `home-budget-web/hooks/useCategories.ts`

```typescript
export function useCategories(); // cached, rarely changes
```

---

## Task 7: TanStack Table Column Definitions

### `home-budget-web/components/transactions/columns.tsx`

Define columns for TanStack Table using `createColumnHelper<TransactionRow>()`:

| Column | Header | Cell Render | Sortable | Width |
|--------|--------|-------------|----------|-------|
| date | Date | `formatDate(row.date)` | Yes | 120px |
| description | Description | Truncated text, full on hover tooltip | Yes | flex |
| categoryName | Category | shadcn `Badge` with category group color. If null: "Uncategorized" badge with warning style | No | 150px |
| accountName | Account | Plain text | No | 120px |
| amount | Amount | `formatCurrency(row.amount)`, green if positive, red if negative, right-aligned | Yes | 120px |
| actions | - | Dropdown menu: Edit, Delete, Change Category | No | 50px |

---

## Task 8: Transaction Table Component

### `home-budget-web/components/transactions/TransactionTable.tsx`

`"use client"` component.

**Features:**
- Uses `useReactTable` from TanStack Table with columns from Task 7
- Server-side pagination: page/pageSize passed to API, total from response
- Server-side sorting: sortBy/sortOrder passed to API
- Renders with shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- Pagination controls at bottom: "Page X of Y", prev/next buttons, page size selector

### `home-budget-web/components/transactions/TransactionFilters.tsx`

`"use client"` filter bar above the table:

| Filter | Component | Behavior |
|--------|-----------|----------|
| Account | shadcn `Select` | Dropdown of accounts from `useAccounts()` |
| Category | shadcn `Command` (combobox) | Searchable category dropdown from `useCategories()` |
| Date range | shadcn date range picker (`Popover` + `Calendar`) | Start/end date selection |
| Search | shadcn `Input` | Debounced (300ms) text search on description |

Filters update URL search params. TanStack Query key includes all filter values so cache is per-filter-combination.

---

## Task 9: Transaction Form Component

### `home-budget-web/components/forms/TransactionForm.tsx`

`"use client"` component using TanStack Form + Zod.

**Fields:**

| Field | Component | Notes |
|-------|-----------|-------|
| account | shadcn `Select` | Required. Populated from `useAccounts()` |
| date | shadcn date picker | Defaults to today |
| description | shadcn `Input` | Required, max 500 |
| amount | shadcn `Input` type number | User enters EUR (e.g. "45.50"), converted to cents (4550) on submit. Positive for income, negative for expense. |
| type toggle | shadcn `Button` group or `Tabs` | "Expense" / "Income" toggle. If expense, negate amount before submit. |
| category | Category combobox | Searchable dropdown, optional |
| notes | shadcn `Input` or `Textarea` | Optional |

**Props:** `mode: "create" | "edit"`, optional `defaultValues`, `onSuccess` callback.

---

## Task 10: Transaction List Page

### `home-budget-web/app/(dashboard)/transactions/page.tsx`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Transactions                    [+ New] [Import] │
├──────────────────────────────────────────────────┤
│ [Account ▼] [Category ▼] [Date range] [Search…] │
├──────────────────────────────────────────────────┤
│ Date       Description      Category  Amount     │
│ 08 Apr     Colruyt groceri… Food      -€87,45    │
│ 07 Apr     Salary April     Income    €3.200,00  │
│ 05 Apr     Netflix          Entert…   -€15,99    │
│ ...                                              │
├──────────────────────────────────────────────────┤
│              Page 1 of 12   [< Prev] [Next >]    │
└──────────────────────────────────────────────────┘
```

- Header with title + "New Transaction" button + "Import CSV" button (links to M3 route, disabled/hidden until M3)
- `<TransactionFilters />` bar
- `<TransactionTable />` with data from `useTransactions(filters)`
- Filters from URL search params, synced bidirectionally

### `home-budget-web/app/(dashboard)/transactions/new/page.tsx`

- Renders `<TransactionForm mode="create" />` in a `Card`
- On success navigates back to transaction list

---

## Acceptance Criteria

1. Can create a transaction with account, date, description, amount (expense/income), category
2. Transaction list shows all transactions with sorting by date (default desc), amount, description
3. Can filter by: account, category, date range, text search
4. Pagination works: 25 per page, prev/next, total count shown
5. Amounts are color-coded: green positive, red negative, Belgian EUR format
6. Categories show as colored badges
7. Can edit a transaction (opens form with prefilled values)
8. Can delete a transaction (confirmation dialog)
9. Can change category inline from the table (dropdown in actions menu)
10. Account balances (from M1) update when transactions are added/removed
11. Mobile responsive: table scrolls horizontally on small screens

## Files Created

```
home-budget-web/
├── lib/
│   ├── validators/transactions.ts
│   ├── queries/transactions.ts
│   └── actions/transactions.ts
├── hooks/
│   ├── useTransactions.ts
│   └── useCategories.ts
├── components/
│   ├── transactions/
│   │   ├── TransactionTable.tsx
│   │   ├── TransactionFilters.tsx
│   │   └── columns.tsx
│   └── forms/TransactionForm.tsx
└── app/
    ├── api/
    │   ├── transactions/
    │   │   ├── route.ts
    │   │   └── [id]/route.ts
    │   └── categories/route.ts
    └── (dashboard)/transactions/
        ├── page.tsx
        └── new/page.tsx
```
