# M7: Stock Portfolio -- Build Report

## Prerequisites

- M1 (accounts) completed: investment-type accounts can be created
- M5 (dashboard) completed: net worth calculation exists (this module extends it)
- `stock_holdings` and `stock_prices` tables exist

## Goal

Track stock/ETF holdings, fetch market prices, display portfolio value, gains/losses, allocation. Integrate with net worth.

---

## Task 1: Install Dependencies

```bash
npm install yahoo-finance2
```

---

## Task 2: Zod Schemas

### `home-budget-web/lib/validators/stocks.ts`

```typescript
import { z } from "zod";

export const addHoldingSchema = z.object({
  accountId: z.number().int().positive(),
  symbol: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1).max(200),
  shares: z.number().positive(),            // fractional allowed
  costBasis: z.number().int().positive(),    // total cost in cents
  purchaseDate: z.coerce.date(),
});

export const updateHoldingSchema = addHoldingSchema.partial().omit({ accountId: true });

export type AddHoldingInput = z.infer<typeof addHoldingSchema>;
```

---

## Task 3: Yahoo Finance Price Service

### `home-budget-web/lib/stocks/prices.ts`

```typescript
import yahooFinance from "yahoo-finance2";
import { db } from "@/lib/db";
import { stockPrices } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

// Fetch latest price for a symbol
export async function fetchLatestPrice(symbol: string): Promise<number> {
  const quote = await yahooFinance.quote(symbol);
  return Math.round(quote.regularMarketPrice! * 100); // cents
}

// Fetch historical daily prices
export async function fetchHistoricalPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ symbol: string; date: Date; price: number }>> {
  const result = await yahooFinance.historical(symbol, {
    period1: startDate,
    period2: endDate,
    interval: "1d",
  });
  return result.map((row) => ({
    symbol,
    date: row.date,
    price: Math.round(row.close * 100),
  }));
}

// Cache price in DB. Skip if already exists for (symbol, date).
export async function cachePrice(symbol: string, date: Date, price: number) {
  await db
    .insert(stockPrices)
    .values({ symbol, date, price })
    .onDuplicateKeyUpdate({ set: { price } }); // upsert
}

// Get latest cached price for a symbol
export async function getLatestCachedPrice(symbol: string): Promise<number | null> {
  const result = await db.query.stockPrices.findFirst({
    where: eq(stockPrices.symbol, symbol),
    orderBy: (sp, { desc }) => [desc(sp.date)],
  });
  return result?.price ?? null;
}

// Refresh prices for all holdings: fetch latest, cache
export async function refreshAllPrices(symbols: string[]): Promise<void> {
  const today = new Date();
  for (const symbol of symbols) {
    try {
      const price = await fetchLatestPrice(symbol);
      await cachePrice(symbol, today, price);
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      // Continue with other symbols
    }
  }
}

// Backfill historical prices from purchase date to today
export async function backfillPrices(symbol: string, startDate: Date): Promise<void> {
  const prices = await fetchHistoricalPrices(symbol, startDate, new Date());
  for (const p of prices) {
    await cachePrice(p.symbol, p.date, p.price);
  }
}
```

**Error handling:** Yahoo Finance can fail for delisted symbols, rate limits, or network issues. Always wrap in try/catch. Show stale cached price with "last updated" timestamp if refresh fails.

---

## Task 4: Query Functions

### `home-budget-web/lib/queries/stocks.ts`

**`getHoldings(accountId?: number)`** -- Get all holdings, optionally filtered by account.

Join with latest cached price to compute current value.

```typescript
interface HoldingSummary {
  id: number;
  accountId: number;
  accountName: string;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;          // cents
  latestPrice: number | null; // cents per share, null if no price data
  currentValue: number;       // shares * latestPrice, cents
  gainLoss: number;           // currentValue - costBasis
  returnPercent: number;      // (gainLoss / costBasis) * 100
  allocationPercent: number;  // computed after fetching all holdings
  purchaseDate: Date;
}
```

**`getPortfolioSummary()`** -- Aggregate all holdings:

```typescript
interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalReturnPercent: number;
  holdings: HoldingSummary[];
}
```

Allocation percentages computed as `holdingValue / totalValue * 100`.

**`getPortfolioHistory(months: number = 12)`** -- Daily total portfolio value for the last N months.

```typescript
interface PortfolioHistoryPoint {
  date: string;      // ISO date
  totalValue: number; // cents
}
```

Query: For each date in `stock_prices`, compute SUM(shares * price) across all holdings. Use the closest available price date for each holding.

---

## Task 5: Server Actions

### `home-budget-web/lib/actions/stocks.ts`

- **`addHolding(input)`** -- Validate, insert into `stock_holdings`, trigger `backfillPrices(symbol, purchaseDate)` and `fetchLatestPrice`. Return holding ID.
- **`updateHolding(id, input)`** -- Update shares, cost basis, etc.
- **`deleteHolding(id)`** -- Hard delete holding (prices remain cached for other potential uses).
- **`refreshPrices()`** -- Get all unique symbols from holdings, call `refreshAllPrices()`. Return count of updated prices.

---

## Task 6: API Routes

### `home-budget-web/app/api/stocks/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | Portfolio summary with all holdings | `{ data: PortfolioSummary }` |
| POST | Add new holding | `{ data: { id: number } }` |

### `home-budget-web/app/api/stocks/[id]/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| GET | Single holding detail | `{ data: HoldingSummary }` |
| PUT | Update holding | `{ data: { success: true } }` |
| DELETE | Delete holding | `{ data: { success: true } }` |

### `home-budget-web/app/api/stocks/prices/route.ts`

| Method | Description | Response |
|--------|------------|----------|
| POST | Refresh all prices | `{ data: { updatedCount: number } }` |
| GET | Portfolio history | `{ data: PortfolioHistoryPoint[] }` (query param `?months=12`) |

---

## Task 7: TanStack Query Hooks

### `home-budget-web/hooks/useStocks.ts`

```typescript
export const stockKeys = {
  portfolio: ["stocks", "portfolio"] as const,
  holdings: ["stocks", "holdings"] as const,
  history: (months: number) => ["stocks", "history", months] as const,
  detail: (id: number) => ["stocks", id] as const,
};

export function usePortfolio();           // GET /api/stocks
export function usePortfolioHistory(months?: number); // GET /api/stocks/prices?months=N
export function useAddHolding();          // POST /api/stocks, invalidates portfolio
export function useUpdateHolding(id: number);
export function useDeleteHolding();
export function useRefreshPrices();       // POST /api/stocks/prices, invalidates all stock keys
```

---

## Task 8: Holdings Table

### `home-budget-web/components/stocks/HoldingsTable.tsx`

`"use client"` component using **TanStack Table** + shadcn `Table`.

**Columns:**

| Column | Header | Cell | Sortable |
|--------|--------|------|----------|
| symbol | Symbol | `{symbol}` bold + `{name}` muted below | Yes |
| shares | Shares | Number with up to 6 decimals | Yes |
| avgCost | Avg Cost | `costBasis / shares`, formatted as currency | Yes |
| latestPrice | Price | Formatted, with "stale" indicator if >1 day old | Yes |
| currentValue | Value | Formatted as currency | Yes (default sort) |
| gainLoss | Gain/Loss | Amount + percentage. Green if positive, red if negative. | Yes |
| allocation | Alloc. | Percentage bar + number | Yes |
| actions | - | Dropdown: Edit, Delete | No |

Footer row: totals for value, cost basis, gain/loss.

---

## Task 9: Holding Form

### `home-budget-web/components/forms/HoldingForm.tsx`

`"use client"` component using TanStack Form + Zod.

**Fields:**

| Field | Component | Notes |
|-------|-----------|-------|
| account | shadcn `Select` | Filtered to `type: "investment"` accounts only |
| symbol | shadcn `Input` | Uppercase, e.g. "VWCE.DE", "AAPL" |
| name | shadcn `Input` | Company/ETF name, e.g. "Vanguard FTSE All-World" |
| shares | shadcn `Input` type number | Decimal allowed (fractional shares) |
| totalCost | shadcn `Input` type number | User enters EUR total cost, convert to cents |
| purchaseDate | shadcn date picker | Date of purchase |

On submit: `useAddHolding().mutate()`. Show loading state while prices backfill.

---

## Task 10: Portfolio Charts

### `home-budget-web/components/charts/PortfolioValue.tsx`

`"use client"` component using **shadcn AreaChart**.

- X-axis: dates (daily over last 12 months)
- Y-axis: EUR total portfolio value
- Single area fill (gradient from primary color)
- Tooltip: date + formatted value
- Data from `usePortfolioHistory(12)`

### `home-budget-web/components/charts/AllocationPie.tsx`

`"use client"` component using **shadcn PieChart**.

- Segments: one per holding, sized by `allocationPercent`
- Top 5 holdings + "Other" bucket
- Legend: symbol + percentage
- Center label: total portfolio value

---

## Task 11: Portfolio Page

### `home-budget-web/app/(dashboard)/stocks/page.tsx`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Portfolio               [Refresh Prices] [+ Add] │
├──────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Value    │ │ Cost     │ │ Return   │          │
│ │ €28,432  │ │ €24,100  │ │ +€4,332  │          │
│ │          │ │          │ │ +18.0%   │          │
│ └──────────┘ └──────────┘ └──────────┘          │
├────────────────────────┬─────────────────────────┤
│ Portfolio Value (12mo) │ Allocation              │
│ [Area Chart]           │ [Pie Chart]             │
├────────────────────────┴─────────────────────────┤
│ Holdings                                         │
│ Symbol    Shares  Avg Cost  Price  Value  G/L  % │
│ VWCE.DE   15.000  €98,12   €104   €1560  +6%  55│
│ AAPL      5.000   €142,30  €168   €840  +18%  30│
│ ...                                              │
└──────────────────────────────────────────────────┘
```

- 3 summary cards at top (total value, total cost, total gain/loss with return %)
- "Refresh Prices" button triggers `useRefreshPrices()`. Show loading spinner on button. Disabled if already refreshing.
- "Add Holding" links to `/stocks/add`
- `<PortfolioValue />` chart + `<AllocationPie />` side by side
- `<HoldingsTable />` below charts
- If no holdings: empty state with prompt to add first holding

### `home-budget-web/app/(dashboard)/stocks/add/page.tsx`

Renders `<HoldingForm />` in a `Card`. On success: navigate back to `/stocks`.

---

## Task 12: Net Worth Integration

Update the dashboard `getDashboardSummary` query (from M5) to include stock portfolio value in net worth:

```
Net Worth = SUM(active account balances) + portfolio total value
```

This requires calling `getPortfolioSummary()` from the dashboard query and adding the `totalValue` to the net worth calculation.

---

## Acceptance Criteria

1. Can add a stock/ETF holding with symbol, shares, cost, purchase date
2. Prices are fetched from Yahoo Finance and cached in `stock_prices` table
3. Historical prices are backfilled from purchase date on first add
4. Portfolio page shows total value, cost basis, gain/loss
5. Holdings table shows per-holding metrics with sorting
6. Allocation pie chart shows portfolio composition
7. Portfolio value area chart shows historical value
8. "Refresh Prices" updates all holdings with latest prices
9. Stale prices (>1 day old) are indicated
10. Failed price fetches don't crash -- show last cached price
11. Dashboard net worth includes stock portfolio value
12. Only investment-type accounts shown in holding form account selector

## Files Created

```
home-budget-web/
├── lib/
│   ├── validators/stocks.ts
│   ├── queries/stocks.ts
│   ├── actions/stocks.ts
│   └── stocks/prices.ts
├── hooks/useStocks.ts
├── components/
│   ├── stocks/HoldingsTable.tsx
│   ├── forms/HoldingForm.tsx
│   └── charts/
│       ├── PortfolioValue.tsx
│       └── AllocationPie.tsx
└── app/
    ├── api/stocks/
    │   ├── route.ts
    │   ├── [id]/route.ts
    │   └── prices/route.ts
    └── (dashboard)/stocks/
        ├── page.tsx
        └── add/page.tsx
```
