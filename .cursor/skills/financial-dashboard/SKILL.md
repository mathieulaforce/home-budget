---
name: financial-dashboard
description: Dashboard layout, chart types, period selectors, and data visualization patterns for financial data. Use when building dashboard pages, creating chart components, or designing comparison views.
---

# Financial Dashboard

## Chart Library

Use **Recharts** (`recharts`) for all charts. It is React-native, composable, and handles responsive sizing well.

All chart components live in `src/components/charts/`.

## Dashboard Layout

### Overview Page (`/overview`)

Top-level summary cards followed by key charts:

```
┌──────────┬──────────┬──────────┬──────────┐
│ Net Worth│ Monthly  │ Savings  │ Budget   │
│          │ Spend    │ Rate     │ Status   │
├──────────┴──────────┴──────────┴──────────┤
│  Monthly Trend (line chart, 12 months)    │
├─────────────────────┬─────────────────────┤
│ Spending by Category│ Budget vs Actual    │
│ (donut chart)       │ (bar chart)         │
├─────────────────────┴─────────────────────┤
│ Recent Transactions (table, last 10)      │
└───────────────────────────────────────────┘
```

### Summary Cards

Each card shows: metric label, current value, change vs previous period (arrow + percentage).

```typescript
interface SummaryCard {
  label: string;
  value: string;         // formatted, e.g. "€12,345.67"
  change: number;        // percentage change vs previous period
  changeDirection: "up" | "down" | "neutral";
  changeIsGood: boolean; // e.g. expenses up = bad, savings up = good
}
```

## Chart Types by Use Case

### 1. Spending by Category — Donut Chart

- **Component**: `SpendingDonut`
- **Data**: category name + total amount for selected period
- **Interaction**: hover shows amount + percentage; click filters transaction list
- Show top 6 categories + "Other" bucket

### 2. Monthly Trend — Line Chart

- **Component**: `MonthlyTrend`
- **Data**: 12 months of income, expenses, net savings
- **Lines**: income (green), expenses (red), net (blue)
- **X-axis**: month labels ("Jan", "Feb", ...)
- **Y-axis**: EUR, formatted

### 3. Budget vs Actual — Grouped Bar Chart

- **Component**: `BudgetComparison`
- **Data**: per category, planned bar + actual bar
- **Colors**: planned (gray/muted), actual (colored — green if under, red if over)
- Horizontal layout works better for many categories

### 4. Household Comparison — Horizontal Bar Chart

- **Component**: `HouseholdComparison`
- **Data**: per category group, user bar + benchmark bar
- **Colors**: user (primary), benchmark (muted/dashed)
- Show percentage difference label on each row

### 5. Stock Portfolio — Area Chart + Allocation Pie

- **Component**: `PortfolioOverview`
- **Area chart**: total portfolio value over time
- **Pie chart**: allocation by holding (percentage of total)

### 6. Account Balances — Stacked Area Chart

- **Component**: `AccountBalances`
- **Data**: daily/monthly balance per account over time
- Stacked to show total net worth composition

## Period Selector

Reusable component placed at the top of every dashboard page:

```typescript
interface PeriodSelection {
  type: "month" | "year" | "custom";
  month?: number;       // 1-12
  year: number;
  startDate?: Date;     // for custom range
  endDate?: Date;
}
```

- **Month picker**: `< April 2026 >`  with prev/next arrows
- **Year picker**: `< 2026 >` with prev/next arrows
- **Custom range**: date range picker for arbitrary periods
- Persisted in URL search params so views are shareable/bookmarkable

## Color Conventions

| Meaning | Color | Tailwind Class |
|---------|-------|---------------|
| Income / Positive | Green | `text-emerald-600` |
| Expense / Negative | Red | `text-red-600` |
| Neutral / Planned | Gray | `text-gray-500` |
| Primary accent | Blue | `text-blue-600` |
| Warning (over budget) | Amber | `text-amber-600` |

For charts, use a consistent categorical palette (Recharts default or a custom 8-color set that works in both light and dark mode).

## Responsive Design

- Cards: 4 columns on desktop, 2 on tablet, 1 on mobile
- Charts: full width, min-height 300px, use `ResponsiveContainer` from Recharts
- Tables: horizontal scroll on mobile, sticky first column
- Period selector: collapses to dropdown on mobile

## Data Tables

For transaction lists and detailed breakdowns:

- Sortable columns (date, amount, category)
- Filterable by account, category, date range
- Pagination: 25 rows per page default
- Amount column right-aligned, color-coded (green/red)
- Format money with `Intl.NumberFormat("de-BE", { style: "currency", currency: "EUR" })`
