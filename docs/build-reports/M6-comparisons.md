# M6: Comparisons -- Build Report

## Prerequisites

- M5 completed: dashboard works, period selection exists
- Transaction data spans multiple months (for meaningful comparisons)
- Categories and spending data available

## Goal

Period-over-period comparison (MoM, YoY) and household benchmark comparison against Belgian averages.

---

## Task 1: Comparison Query Functions

### `home-budget-web/lib/queries/comparisons.ts`

**`getPeriodComparison(currentPeriod, previousPeriod)`**

Compare spending by category between two periods.

```typescript
interface PeriodComparison {
  categoryId: number;
  categoryName: string;
  categoryGroup: string;
  currentPeriod: number;   // cents (absolute value of expenses)
  previousPeriod: number;  // cents
  change: number;          // current - previous
  changePercent: number;   // (change / |previous|) * 100, handle division by zero
}
```

Query: For each category, SUM(amount) WHERE amount < 0 in each period. Exclude transfers. Return absolute values.

Also compute totals:
```typescript
interface ComparisonResult {
  categories: PeriodComparison[];
  currentTotal: number;
  previousTotal: number;
  totalChange: number;
  totalChangePercent: number;
  currentPeriodLabel: string;  // "April 2026"
  previousPeriodLabel: string; // "March 2026"
}
```

**`getMultiMonthTrend(categoryGroup: string, months: number)`**

For a specific category group, return monthly spending for N months. Used for sparklines or detail views.

---

## Task 2: Benchmark Data & Queries

### `home-budget-web/lib/benchmarks/data.ts`

Static dataset from `.cursor/skills/household-benchmarks/benchmark-data.md`:

```typescript
export interface HouseholdBenchmark {
  categoryGroup: string;
  averageMonthly: number; // cents
  region: string;
}

export const belgiumBenchmarks: HouseholdBenchmark[] = [
  { categoryGroup: "Housing", averageMonthly: 85000, region: "belgium" },
  { categoryGroup: "Food", averageMonthly: 45000, region: "belgium" },
  { categoryGroup: "Transport", averageMonthly: 35000, region: "belgium" },
  { categoryGroup: "Health", averageMonthly: 12000, region: "belgium" },
  { categoryGroup: "Entertainment", averageMonthly: 20000, region: "belgium" },
  { categoryGroup: "Shopping", averageMonthly: 25000, region: "belgium" },
  { categoryGroup: "Financial", averageMonthly: 18000, region: "belgium" },
];

export const regionalMultipliers: Record<string, number> = {
  belgium: 1.0,
  flanders: 1.02,
  wallonia: 0.92,
  brussels: 1.10,
};

export const householdSizeMultipliers: Record<string, number> = {
  single: 0.60,
  couple: 0.85,
  couple_1child: 1.00,
  couple_2children: 1.15,
  couple_3plus: 1.30,
  single_parent: 0.75,
};
```

### `home-budget-web/lib/benchmarks/categoryMapping.ts`

Maps app category groups to benchmark category groups:

```typescript
export const categoryGroupMapping: Record<string, string> = {
  Housing: "Housing",
  Food: "Food",
  Transport: "Transport",
  Health: "Health",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
  Financial: "Financial",
};
```

### `home-budget-web/lib/queries/benchmarks.ts`

**`getHouseholdComparison(region, householdSize, months)`**

1. Compute user's average monthly spend per category group over the last `months` months (default 3). Exclude transfers. Use absolute values.
2. Get benchmark amounts, apply regional + household size multipliers.
3. Compute difference and rating.

```typescript
interface BenchmarkComparison {
  categoryGroup: string;
  userMonthly: number;        // cents
  benchmarkMonthly: number;   // cents (after multipliers)
  difference: number;         // user - benchmark
  differencePercent: number;
  rating: "below" | "average" | "above"; // <80% = below, 80-120% = average, >120% = above
}
```

Rating thresholds: below (<80%), average (80-120%), above (>120%) of benchmark.

---

## Task 3: API Routes

### `home-budget-web/app/api/comparisons/route.ts`

| Param | Description |
|-------|------------|
| `type` | `"mom"` (month-over-month) or `"yoy"` (year-over-year) |
| `year` | Reference year |
| `month` | Reference month |

For MoM: current = year/month, previous = year/(month-1) or previous year December.
For YoY: current = year/month, previous = (year-1)/month.

Response: `{ data: ComparisonResult }`

### `home-budget-web/app/api/benchmarks/route.ts`

| Param | Description |
|-------|------------|
| `region` | "belgium", "flanders", "wallonia", "brussels" |
| `householdSize` | "single", "couple", "couple_1child", etc. |
| `months` | Number of months to average (default 3) |

Response: `{ data: { comparisons: BenchmarkComparison[], referenceYear: 2023, source: "statbel-hbs-2023" } }`

---

## Task 4: TanStack Query Hooks

### `home-budget-web/hooks/useComparisons.ts`

```typescript
export function usePeriodComparison(type: "mom" | "yoy", year: number, month: number);
export function useHouseholdBenchmarks(region: string, householdSize: string, months?: number);
```

---

## Task 5: Period Comparison Chart

### `home-budget-web/components/charts/PeriodComparison.tsx`

`"use client"` component using **shadcn BarChart**.

- Horizontal grouped bar chart
- One group per category
- Two bars: current period (primary color) vs previous period (muted color)
- Labels on bars: EUR amount
- Change indicator to the right of each group: "+€45 (+12%)" in red/green
- Sort by largest absolute change (most significant changes first)

---

## Task 6: Household Comparison Chart

### `home-budget-web/components/charts/HouseholdComparison.tsx`

`"use client"` component using **shadcn BarChart** (horizontal).

- One group per category group
- Two bars: "You" (primary) vs "Average" (muted/dashed)
- Color-coded by rating:
  - Below average (green): your bar is shorter
  - Average (amber/neutral): similar length
  - Above average (red): your bar is longer
- Percentage difference label on each row

---

## Task 7: Household Settings Form

### `home-budget-web/components/comparisons/HouseholdSettings.tsx`

`"use client"` component.

- Region selector: shadcn `Select` with options: Belgium, Flanders, Wallonia, Brussels
- Household size selector: shadcn `Select` with options: Single, Couple, Couple + 1 child, Couple + 2 children, Couple + 3+ children, Single parent
- Averaging period: shadcn `Select` with options: Last 3 months, Last 6 months, Last 12 months
- Changes immediately update the benchmark comparison (no submit button -- live update via TanStack Query key change)

Persist selections in URL search params or localStorage.

---

## Task 8: Comparisons Page

### `home-budget-web/app/(dashboard)/comparisons/page.tsx`

**Layout:** shadcn `Tabs` with 3 tabs:

**Tab 1: Month-over-Month**
```
┌──────────────────────────────────────────────────┐
│ April 2026 vs March 2026      < Apr 2026 >       │
├──────────────────────────────────────────────────┤
│ Total: €2,180 vs €2,345  (▼ -7.0%)              │
├──────────────────────────────────────────────────┤
│ [Period Comparison Bar Chart]                    │
├──────────────────────────────────────────────────┤
│ Category detail table (sortable)                 │
└──────────────────────────────────────────────────┘
```

**Tab 2: Year-over-Year**
Same layout as MoM but comparing current month vs same month last year.

**Tab 3: Household Benchmarks**
```
┌──────────────────────────────────────────────────┐
│ How do you compare?    [Region ▼] [Size ▼] [3mo]│
├──────────────────────────────────────────────────┤
│ [Household Comparison Bar Chart]                 │
├──────────────────────────────────────────────────┤
│ Category Group   You      Average   Diff   Rate │
│ Food             €520     €450      +€70   Above│
│ Housing          €850     €850      €0     Avg  │
│ Transport        €95      €350      -€255  Below│
│ ...                                              │
├──────────────────────────────────────────────────┤
│ ⓘ Based on Statbel HBS 2023 data.               │
│   Averages vary by income and household size.    │
└──────────────────────────────────────────────────┘
```

Period selector (shared with MoM/YoY tabs) in the page header.

---

## Acceptance Criteria

1. MoM tab shows current vs previous month spending by category
2. YoY tab shows current month vs same month last year
3. Household tab shows user spending vs Belgian averages
4. Changing region/household size immediately updates benchmark comparison
5. Rating badges (Below/Average/Above) are correct per threshold
6. Charts are clear and color-coded
7. Period navigation works (prev/next month)
8. Detail table shows exact numbers per category
9. Disclaimer about data source is visible
10. Handles edge cases: no data for previous period, less than 3 months of data

## Files Created

```
home-budget-web/
├── lib/
│   ├── queries/comparisons.ts
│   ├── queries/benchmarks.ts
│   ├── benchmarks/data.ts
│   └── benchmarks/categoryMapping.ts
├── hooks/useComparisons.ts
├── components/
│   ├── charts/PeriodComparison.tsx
│   ├── charts/HouseholdComparison.tsx
│   └── comparisons/HouseholdSettings.tsx
└── app/
    ├── api/
    │   ├── comparisons/route.ts
    │   └── benchmarks/route.ts
    └── (dashboard)/comparisons/page.tsx
```
