# M5: Dashboard -- Build Report

## Prerequisites

- M2 (transactions) + M4 (budgets) completed
- Charts package installed (shadcn charts from M0)
- Transactions and budgets have data to display

## Goal

Overview page with summary cards, spending breakdown, monthly trends, budget status, and recent transactions. All driven by a period selector.

---

## Task 1: Query Functions

### `home-budget-web/lib/queries/dashboard.ts`

All queries accept a period: `{ startDate: Date, endDate: Date }`.

**`getDashboardSummary(period)`**

Computes 4 metrics for the summary cards:

```typescript
interface DashboardSummary {
  netWorth: number;           // SUM(account balances) -- all active accounts
  totalSpend: number;         // SUM(amount) WHERE amount < 0 in period (as positive)
  savingsRate: number;        // (income + expenses) / income * 100
  budgetStatus: {             // for the matching budget (same year/month)
    totalPlanned: number;
    totalActual: number;
    variance: number;
  } | null;
}
```

Also compute the previous period values (same duration, immediately before) for change indicators:

```typescript
interface SummaryWithChange extends DashboardSummary {
  spendChange: number;        // percentage change vs previous period
  savingsRateChange: number;  // absolute change in percentage points
}
```

**`getSpendingByCategory(period)`**

```typescript
interface CategorySpending {
  categoryId: number;
  categoryName: string;
  categoryGroup: string;
  total: number;         // cents (absolute value of expense total)
  percentage: number;    // of total spending
}
```

Return top 6 categories by total + "Other" bucket for the rest. Exclude income categories. Exclude transfers.

**`getMonthlyTrend(months: number = 12)`**

```typescript
interface MonthlyTrend {
  month: string;   // "2026-04", "2026-03", ...
  income: number;  // cents
  expenses: number; // cents (as positive value)
  net: number;     // income - expenses
}
```

Return array of N months ending with current month. Each entry aggregates all transactions in that calendar month. Exclude transfers.

**`getRecentTransactions(limit: number = 10)`**

Return last N transactions across all active accounts, joined with category and account names. Use same `TransactionRow` shape from M2.

---

## Task 2: API Route

### `home-budget-web/app/api/dashboard/route.ts`

| Method | Params | Response |
|--------|--------|----------|
| GET | `?year=2026&month=4` or `?startDate=...&endDate=...` | `{ data: { summary, categorySpending, monthlyTrend, recentTransactions } }` |

Compute period from params: if year+month, compute first/last day. If custom dates, use those.

---

## Task 3: TanStack Query Hooks

### `home-budget-web/hooks/useDashboard.ts`

```typescript
export const dashboardKeys = {
  all: (period: PeriodSelection) => ["dashboard", period] as const,
};

export function useDashboard(period: PeriodSelection) {
  return useQuery({
    queryKey: dashboardKeys.all(period),
    queryFn: () => fetchDashboardData(period),
  });
}
```

Period changes trigger a new query (different cache key). Previous data stays visible while new data loads (TanStack Query's `keepPreviousData: true`).

---

## Task 4: Period Selector Component

### `home-budget-web/components/dashboard/PeriodSelector.tsx`

`"use client"` component.

**Modes:**
- **Month**: `< [April 2026] >` with prev/next arrows
- **Year**: `< [2026] >` with prev/next arrows
- **Custom**: Date range picker (two calendars)

**State:** Stored in URL search params (`?period=month&year=2026&month=4`). Use `useSearchParams` + `useRouter` to read/write.

```typescript
interface PeriodSelection {
  type: "month" | "year" | "custom";
  year: number;
  month?: number;        // 1-12, for month mode
  startDate?: string;    // ISO date, for custom mode
  endDate?: string;
}
```

**UI:** shadcn `Select` for mode toggle + navigation arrows. For custom mode, use shadcn `Popover` + `Calendar` (date range variant).

---

## Task 5: Summary Cards

### `home-budget-web/components/dashboard/SummaryCards.tsx`

`"use client"` component. Grid of 4 shadcn `Card` components.

| Card | Value | Change Indicator | Color Logic |
|------|-------|-----------------|-------------|
| Net Worth | `formatCurrency(netWorth)` | - (no change for net worth) | Always neutral |
| Monthly Spend | `formatCurrency(totalSpend)` | `spendChange%` vs previous period | Green if decreased, red if increased |
| Savings Rate | `savingsRate%` | `+/-X pp` vs previous period | Green if increased, red if decreased |
| Budget Status | `formatCurrency(variance)` | "Under budget" / "Over budget" | Green if negative variance (under), red if positive (over), gray if no budget |

Each card layout:
```
┌──────────────┐
│ Label        │
│ €12,345.67   │  <- large value
│ ▲ +5.2%      │  <- change indicator with arrow
└──────────────┘
```

---

## Task 6: Spending Donut Chart

### `home-budget-web/components/charts/SpendingDonut.tsx`

`"use client"` component using **shadcn PieChart**.

- Data: `CategorySpending[]` (top 6 + Other)
- Each segment: category name, amount, percentage
- Center label: total spend
- Legend below chart with colored dots + category name + amount
- Tooltip on hover: category name, amount, percentage
- Use a 7-color categorical palette that works in light and dark mode

---

## Task 7: Monthly Trend Chart

### `home-budget-web/components/charts/MonthlyTrend.tsx`

`"use client"` component using **shadcn LineChart**.

- X-axis: month labels ("Jan", "Feb", ...)
- Y-axis: EUR amount (auto-scaled)
- Three lines:
  - Income (green/emerald)
  - Expenses (red)
  - Net savings (blue)
- Tooltip: month name + all three values formatted as currency
- Grid lines on Y-axis

---

## Task 8: Budget Status Bar

### `home-budget-web/components/charts/BudgetStatusBar.tsx`

`"use client"` component using **shadcn BarChart**.

- Horizontal stacked/grouped bar showing planned vs actual for top 5 expense categories
- Simpler version of M4's BudgetComparison chart (fewer categories, compact)
- If no budget exists for current period: show "No budget set" placeholder with link to create one

---

## Task 9: Recent Transactions Table

### `home-budget-web/components/dashboard/RecentTransactions.tsx`

`"use client"` component using **TanStack Table** (compact mode).

- Columns: date, description, category (badge), amount (colored)
- No pagination, no filters -- just last 10 transactions
- "View all" link at the bottom navigates to `/transactions`

---

## Task 10: Dashboard Page

### `home-budget-web/app/(dashboard)/overview/page.tsx`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Overview                    [Month ▼] < Apr 2026 >│
├──────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│ │Net Worth │ │Spending  │ │Savings   │ │Budget│ │
│ │€25,432   │ │€2,180    │ │31%       │ │-€165 │ │
│ │          │ │▼ -3.2%   │ │▲ +2pp    │ │Under │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────┘ │
├──────────────────────┬───────────────────────────┤
│ Monthly Trend        │ Spending by Category      │
│ [Line Chart 12mo]    │ [Donut Chart]             │
├──────────────────────┴───────────────────────────┤
│ Budget vs Actual (compact bar)                   │
├──────────────────────────────────────────────────┤
│ Recent Transactions                  [View All →]│
│ 08 Apr  Colruyt groceries  Food      -€87,45    │
│ 07 Apr  Salary April       Income    €3.200,00  │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

- `<PeriodSelector />` in the page header
- Period state from URL params, passed to `useDashboard(period)`
- Loading state: shadcn `Skeleton` components matching each card/chart shape
- All charts and cards consume data from the single `useDashboard` query

---

## Acceptance Criteria

1. Dashboard loads with current month selected by default
2. Summary cards show net worth, spending, savings rate, budget status
3. Change indicators show comparison with previous period
4. Spending donut shows top 6 categories + Other
5. Monthly trend shows 12 months of income/expenses/net
6. Budget status bar shows planned vs actual (or placeholder if no budget)
7. Recent transactions shows last 10
8. Period selector switches between month/year/custom
9. Changing period updates all charts and cards (via TanStack Query)
10. Loading skeletons show while data fetches
11. Works with empty data (no transactions yet -- shows zeros, empty charts)

## Files Created

```
home-budget-web/
├── lib/queries/dashboard.ts
├── hooks/useDashboard.ts
├── components/
│   ├── dashboard/
│   │   ├── SummaryCards.tsx
│   │   ├── PeriodSelector.tsx
│   │   └── RecentTransactions.tsx
│   └── charts/
│       ├── SpendingDonut.tsx
│       ├── MonthlyTrend.tsx
│       └── BudgetStatusBar.tsx
└── app/
    ├── api/dashboard/route.ts
    └── (dashboard)/overview/page.tsx
```
