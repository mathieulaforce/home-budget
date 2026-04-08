---
name: stock-portfolio-tracking
description: Stock and investment portfolio tracking including holdings management, price fetching, valuation, and performance display. Use when building stock/investment features, fetching market data, or calculating portfolio metrics.
---

# Stock Portfolio Tracking

## Overview

Track stock and ETF holdings across investment accounts. Show current value, gains/losses, and allocation.

## Core Concepts

| Term | Definition |
|------|-----------|
| Holding | A position in a stock/ETF: symbol, shares owned, cost basis |
| Cost Basis | Total amount paid to acquire the shares (in cents) |
| Current Value | Shares * latest price (in cents) |
| Unrealized Gain/Loss | Current Value - Cost Basis |
| Return % | (Unrealized Gain / Cost Basis) * 100 |
| Allocation % | (Holding Value / Total Portfolio Value) * 100 |

## Data Model

Uses two tables (defined in `financial-data-model` skill):

- **`stock_holdings`**: what the user owns (symbol, shares, cost_basis, account)
- **`stock_prices`**: historical daily prices per symbol (for valuation + charts)

## Price Data

### Source Options (in order of preference)

1. **Yahoo Finance (unofficial API)** via `yahoo-finance2` npm package — free, no API key, good coverage of EU/US stocks and ETFs
2. **Alpha Vantage** — free tier (25 requests/day), requires API key
3. **Manual entry** — user enters current price, fallback for unlisted securities

### Fetching Strategy

```typescript
import yahooFinance from "yahoo-finance2";

async function fetchLatestPrice(symbol: string): Promise<number> {
  const quote = await yahooFinance.quote(symbol);
  // quote.regularMarketPrice is in the stock's currency
  return Math.round(quote.regularMarketPrice * 100); // to cents
}

async function fetchHistoricalPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
) {
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
```

### Price Refresh

- Fetch latest prices on-demand when user visits the stocks page
- Cache in `stock_prices` table to avoid repeated API calls on same day
- Historical prices: backfill once per holding, then append daily

### Currency Handling

- Stock prices are in the stock's native currency (USD for US stocks, EUR for European)
- If the user's base currency differs, apply exchange rate conversion
- For MVP: assume EUR-denominated holdings (most Belgian brokers trade in EUR)
- Store which currency a price is in if multi-currency support is added later

## Portfolio Calculations

```typescript
interface PortfolioSummary {
  totalValue: number;           // cents
  totalCostBasis: number;       // cents
  totalGainLoss: number;        // cents (value - costBasis)
  totalReturnPercent: number;
  holdings: HoldingSummary[];
}

interface HoldingSummary {
  id: number;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;            // cents
  latestPrice: number;          // cents per share
  currentValue: number;         // cents (shares * latestPrice)
  gainLoss: number;             // cents
  returnPercent: number;
  allocationPercent: number;    // of total portfolio
}
```

## Integration with Net Worth

Portfolio value feeds into the overall net worth calculation:

```
Net Worth = SUM(account balances) + SUM(stock portfolio current values)
```

Stock accounts (`type: "investment"`) may have a cash balance (from dividends, uninvested funds) tracked via the account's `initial_balance` + transaction history, plus the market value of holdings.

## Display Components

### Holdings Table

| Column | Content |
|--------|---------|
| Symbol | Ticker + company name |
| Shares | Quantity owned |
| Avg Cost | Cost basis / shares |
| Current Price | Latest fetched price |
| Value | Current value |
| Gain/Loss | Amount + percentage, color coded |
| Allocation | % of total portfolio |

Sort by: value (default), gain/loss, allocation.

### Portfolio Value Chart

- **Type**: Area chart (from `financial-dashboard` skill)
- **Data**: daily total portfolio value over time
- **Computed from**: `SUM(shares * price_on_date)` for each date in `stock_prices`

### Allocation Pie

- **Type**: Donut/pie chart
- **Segments**: one per holding, sized by current value percentage
- Show top 5 + "Other" if many holdings

## Adding Holdings

User provides:
- Account (must be `type: "investment"`)
- Symbol (with autocomplete/search if possible)
- Number of shares
- Total cost (or price per share)
- Purchase date

On save:
1. Insert into `stock_holdings`
2. Fetch and store historical prices from purchase date to today
3. Fetch latest price

## Dividends (Simplified)

For MVP, track dividends as regular income transactions on the investment account with category "Dividends". No separate dividend tracking table needed initially.
