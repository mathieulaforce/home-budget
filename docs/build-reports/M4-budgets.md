# M4: Budgets -- Build Report

## Prerequisites

- M2 completed: transactions exist with categories, `getTransactions` works
- `budgets` and `budget_items` tables exist
- Categories seeded

## Goal

Create monthly/yearly budgets with planned amounts per category. View budget vs actual spending.

---

## Task 1: Zod Schemas

### `home-budget-web/lib/validators/budgets.ts`

```typescript
import { z } from "zod";

export const budgetItemSchema = z.object({
  categoryId: z.number().int().positive(),
  plannedAmount: z.number().int().min(0), // cents, always positive
});

export const createBudgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).nullable(), // null = yearly
  name: z.string().min(1).max(100),
  items: z.array(budgetItemSchema).min(1, "At least one budget item required"),
});

export const updateBudgetItemSchema = z.object({
  plannedAmount: z.number().int().min(0),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
```

---

## Task 2: Query Functions

### `home-budget-web/lib/queries/budgets.ts`

**`getBudgets()`** -- List all budgets, ordered by year desc, month desc.

Return shape:
```typescript
interface BudgetListItem {
  id: number;
  year: number;
  month: number | null;
  name: string;
  totalPlanned: number; // SUM of budget_items.planned_amount, cents
  createdAt: Date;
}
```

**`getBudgetWithItems(budgetId: number)`** -- Single budget with all items joined to categories.

Return shape:
```typescript
interface BudgetDetail {
  id: number;
  year: number;
  month: number | null;
  name: string;
  items: BudgetItemDetail[];
}

interface BudgetItemDetail {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryGroup: string;
  isIncome: boolean;
  plannedAmount: number; // cents
}
```

**`getBudgetVsActual(budgetId: number)`** -- The core comparison query.

For each budget item, compute actual spending from transactions in the budget's period:
- Period: if monthly, first/last day of that month+year. If yearly, Jan 1 to Dec 31.
- Actual = `SUM(transactions.amount)` WHERE `category_id = item.category_id` AND `date` in period AND account is active.
- For expense categories: actual is negative sum, display as positive. Variance = `|actual| - planned`.
- For income categories: actual is positive sum. Variance = `actual - planned`.

Return shape:
```typescript
interface BudgetComparison {
  categoryId: number;
  categoryName: string;
  categoryGroup: string;
  isIncome: boolean;
  planned: number;         // cents (always positive)
  actual: number;          // cents (absolute value of actual spending)
  variance: number;        // actual - planned (positive = overspent for expenses)
  variancePercent: number; // (variance / planned) * 100
}
```

Also compute totals:
```typescript
interface BudgetVsActualResult {
  budget: BudgetDetail;
  comparisons: BudgetComparison[];
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
}
```

---

## Task 3: Server Actions

### `home-budget-web/lib/actions/budgets.ts`

- **`createBudget(input)`** -- Validate, insert into `budgets`, then bulk insert `budget_items`. Use a transaction for atomicity.
- **`updateBudgetItem(itemId, input)`** -- Update `planned_amount` for a single item.
- **`deleteBudget(budgetId)`** -- Delete budget and all its items (CASCADE or manual).
- **`duplicateBudget(budgetId, newYear, newMonth)`** -- Copy a budget's items to a new period (common use case: reuse last month's budget).

---

## Task 4: API Routes

### `home-budget-web/app/api/budgets/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | List all budgets with totalPlanned | `{ data: BudgetListItem[] }` |
| POST | Create budget with items | `{ data: { id: number } }` |

### `home-budget-web/app/api/budgets/[id]/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | Budget detail with items OR budget vs actual | `{ data: BudgetVsActualResult }` (include `?compare=true` query param for vs actual) |
| PUT | Update budget items | `{ data: { success: true } }` |
| DELETE | Delete budget | `{ data: { success: true } }` |

---

## Task 5: TanStack Query Hooks

### `home-budget-web/hooks/useBudgets.ts`

```typescript
export const budgetKeys = {
  all: ["budgets"] as const,
  detail: (id: number) => ["budgets", id] as const,
  comparison: (id: number) => ["budgets", id, "comparison"] as const,
};

export function useBudgets();
export function useBudgetComparison(id: number);
export function useCreateBudget();
export function useUpdateBudgetItem(budgetId: number);
export function useDeleteBudget();
export function useDuplicateBudget();
```

---

## Task 6: Budget Form Component

### `home-budget-web/components/forms/BudgetForm.tsx`

`"use client"` component using TanStack Form.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Name: [April 2026          ]            │
│ Year: [2026 ▼]  Month: [April ▼] [○ Y] │
├─────────────────────────────────────────┤
│ Category              Planned Amount    │
│ ─────────────────────────────────────── │
│ Groceries             [€ 450,00    ]    │
│ Restaurants           [€ 100,00    ]    │
│ Fuel                  [€ 120,00    ]    │
│ Rent/Mortgage         [€ 850,00    ]    │
│ ...                                     │
│ [+ Add Category]                        │
├─────────────────────────────────────────┤
│ Total Planned: €2.345,00                │
│                          [Cancel] [Save]│
└─────────────────────────────────────────┘
```

- Year selector (shadcn `Select`)
- Month selector (shadcn `Select`, or null checkbox for yearly)
- Name auto-generates from year+month but is editable
- Dynamic list of category rows: each row is a `Select` (category) + `Input` (amount in EUR)
- "Add Category" button to add a row
- Remove button (X) on each row
- Total planned sum at the bottom (live calculation)
- Pre-populate with all expense categories when creating new (user removes unwanted ones)

**Props:** `mode: "create" | "edit"`, optional `defaultValues` from existing budget.

---

## Task 7: Budget Comparison Chart

### `home-budget-web/components/charts/BudgetComparison.tsx`

`"use client"` component using **shadcn BarChart**.

**Chart spec:**
- Horizontal grouped bar chart
- One group per category
- Two bars per group: Planned (gray) and Actual (colored)
- Actual bar color: green if under budget, red if over budget
- Y-axis: category names
- X-axis: EUR amount
- Tooltip: shows planned, actual, variance, variance %

**Data source:** `BudgetComparison[]` from `useBudgetComparison(id)`.

---

## Task 8: Budget List Page

### `home-budget-web/app/(dashboard)/budgets/page.tsx`

**Layout:**
```
┌──────────────────────────────────────────┐
│ Budgets                    [+ New Budget]│
├──────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐       │
│ │ April 2026   │ │ March 2026   │       │
│ │ €2,345.00    │ │ €2,200.00    │       │
│ │ Monthly      │ │ Monthly      │       │
│ └──────────────┘ └──────────────┘       │
└──────────────────────────────────────────┘
```

- Grid of shadcn `Card` components
- Each card: budget name, total planned, period type badge (Monthly/Yearly)
- Clickable -> navigates to budget detail
- "New Budget" button -> `/budgets/new`

### `home-budget-web/app/(dashboard)/budgets/new/page.tsx`

Renders `<BudgetForm mode="create" />`.

---

## Task 9: Budget Detail Page

### `home-budget-web/app/(dashboard)/budgets/[id]/page.tsx`

**Layout:**
```
┌──────────────────────────────────────────────┐
│ ← Back    April 2026         [Edit] [Dup] [⋮]│
├──────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Planned  │ │ Actual   │ │ Variance │      │
│ │ €2,345   │ │ €2,180   │ │ -€165 ✓  │      │
│ └──────────┘ └──────────┘ └──────────┘      │
├──────────────────────────────────────────────┤
│ [Budget vs Actual Bar Chart]                 │
├──────────────────────────────────────────────┤
│ Category        Planned   Actual   Variance  │
│ Groceries       €450      €487     +€37 ▲    │
│ Rent            €850      €850     €0        │
│ Fuel            €120      €95      -€25 ▼    │
│ ...                                          │
└──────────────────────────────────────────────┘
```

- 3 summary cards at top: total planned, total actual, total variance (color-coded)
- `<BudgetComparison />` chart
- Detail table below chart: per-category planned, actual, variance, variance %
- "Edit" opens form in edit mode
- "Duplicate" creates a copy for a different month (opens dialog to pick month/year)
- Delete in overflow menu with confirmation

---

## Acceptance Criteria

1. Can create a monthly budget with planned amounts per category
2. Can create a yearly budget
3. Budget list shows all budgets as cards
4. Budget detail page shows planned vs actual per category
5. Bar chart correctly visualizes planned vs actual
6. Variance is calculated correctly (positive = overspent for expenses)
7. Can edit budget items (change planned amounts)
8. Can duplicate a budget to a new month
9. Can delete a budget
10. Total planned updates live as you edit the form

## Files Created

```
home-budget-web/
├── lib/
│   ├── validators/budgets.ts
│   ├── queries/budgets.ts
│   └── actions/budgets.ts
├── hooks/useBudgets.ts
├── components/
│   ├── forms/BudgetForm.tsx
│   └── charts/BudgetComparison.tsx
└── app/
    ├── api/budgets/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── (dashboard)/budgets/
        ├── page.tsx
        ├── new/page.tsx
        └── [id]/page.tsx
```
