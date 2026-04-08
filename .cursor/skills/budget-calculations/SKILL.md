---
name: budget-calculations
description: Spending aggregation, savings tracking, budget-vs-actual variance, and period-over-period comparison logic. Use when implementing budget features, building summary queries, or creating comparison views.
---

# Budget Calculations

## Core Definitions

| Metric | Formula | Notes |
|--------|---------|-------|
| Total Income | `SUM(amount) WHERE amount > 0` | For a given period and account(s) |
| Total Expenses | `SUM(amount) WHERE amount < 0` | Returned as negative; display as absolute |
| Net Savings | `Total Income + Total Expenses` | Positive = saved, negative = overspent |
| Savings Rate | `Net Savings / Total Income * 100` | As percentage; undefined if no income |
| Budget Variance | `Actual - Planned` | Per category; negative = under budget (good for expenses) |
| Variance % | `(Actual - Planned) / Planned * 100` | |

## Period Definitions

All calculations operate on a **period** — a date range that maps to:

| Period Type | Date Range |
|------------|-----------|
| Monthly | First day of month → last day of month |
| Yearly | Jan 1 → Dec 31 |
| Custom | User-selected start → end date |

Always filter with `date >= periodStart AND date <= periodEnd`.

## Spending by Category

Aggregate transactions grouped by category for a period:

```sql
SELECT
  c.id,
  c.name,
  c.group_name,
  SUM(t.amount) as total,
  COUNT(t.id) as tx_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.date >= :start AND t.date <= :end
  AND t.account_id IN (:accountIds)
GROUP BY c.id, c.name, c.group_name
ORDER BY total ASC
```

Return both the raw totals and the percentage of total spend per category.

## Budget vs Actual

For a given Budget (year + optional month):

```typescript
interface BudgetComparison {
  categoryId: number;
  categoryName: string;
  planned: number;       // cents, from budget_items.planned_amount
  actual: number;        // cents, SUM of transactions for that category in period
  variance: number;      // actual - planned
  variancePercent: number;
}
```

**Sign convention for expenses**: both `planned` and `actual` are stored/returned as positive amounts for expenses. The variance is `actual - planned`: positive means overspent, negative means under budget.

For income categories: positive variance means earned more than planned (good).

## Period-over-Period Comparison

Compare two periods side by side:

```typescript
interface PeriodComparison {
  categoryId: number;
  categoryName: string;
  currentPeriod: number;   // cents
  previousPeriod: number;  // cents
  change: number;          // current - previous
  changePercent: number;   // (change / |previous|) * 100
}
```

### Month-over-Month (MoM)

Compare current month with previous month. Useful for spotting spending spikes.

### Year-over-Year (YoY)

Compare current month with same month last year. Better for seasonal patterns.

### Multi-Month Trend

Return an array of monthly totals for N months, per category or overall:

```typescript
interface MonthlyTrend {
  month: string;   // "2026-01", "2026-02", ...
  income: number;
  expenses: number;
  net: number;
}
```

## Handling Edge Cases

### Transfers Between Accounts

Transactions with the "Transfer" category should be **excluded** from spending/income totals. They move money between your own accounts, not in/out of your household.

Filter: `WHERE c.group_name != 'Financial' OR c.name != 'Savings Transfer'`

Or tag transfer transactions and exclude them from aggregations.

### Partial Months

When the current month is not yet complete, comparisons should note that the period is partial. Options:
- Show actual values with a "partial month" indicator
- Extrapolate: `actual / days_elapsed * days_in_month` (less reliable)
- Prefer showing actuals with a disclaimer

### Multiple Accounts

By default, aggregate across all active accounts. Allow the user to filter by specific accounts. Avoid double-counting transfers between included accounts.

### Uncategorized Transactions

Include uncategorized transactions in totals but show them as a separate "Uncategorized" line in breakdowns so the user is prompted to categorize them.

## Account Balance Calculation

Current balance for an account:

```
Balance = initial_balance + SUM(all transactions for account)
```

Net worth across all accounts:

```
Net Worth = SUM(account balances) + SUM(stock portfolio current value)
```
