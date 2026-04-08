import "server-only";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default as {
  quote(symbol: string): Promise<{ regularMarketPrice?: number }>;
  historical(
    symbol: string,
    opts: { period1: Date; period2: Date; interval: string }
  ): Promise<Array<{ date: Date; close: number }>>;
};
import { db } from "@/lib/db";
import { stockPrices } from "@/lib/db/schema";

const RATE_LIMIT_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLatestPrice(
  symbol: string
): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (!quote.regularMarketPrice) return null;
    return Math.round(quote.regularMarketPrice * 100);
  } catch (err) {
    throw new Error(
      `Failed to fetch price for ${symbol}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export async function fetchHistoricalPrices(
  symbol: string,
  from: Date,
  to: Date
): Promise<Array<{ symbol: string; date: Date; price: number }>> {
  try {
    const result = await yahooFinance.historical(symbol, {
      period1: from,
      period2: to,
      interval: "1d",
    });
    return result.map((row: { date: Date; close: number }) => ({
      symbol,
      date: row.date,
      price: Math.round(row.close * 100),
    }));
  } catch (err) {
    throw new Error(
      `Failed to fetch historical prices for ${symbol}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export async function cachePrice(
  symbol: string,
  date: Date,
  price: number
): Promise<void> {
  await db
    .insert(stockPrices)
    .values({ symbol, date, price })
    .onDuplicateKeyUpdate({ set: { price } });
}

export async function refreshAllPrices(
  symbols: string[]
): Promise<{ refreshed: number; failed: string[] }> {
  const failed: string[] = [];
  let refreshed = 0;
  const today = new Date();

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      const price = await fetchLatestPrice(symbol);
      if (price !== null) {
        await cachePrice(symbol, today, price);
        refreshed++;
      } else {
        failed.push(symbol);
      }
    } catch {
      failed.push(symbol);
    }

    if (i < symbols.length - 1) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  return { refreshed, failed };
}

export async function backfillPrices(
  symbol: string,
  startDate: Date
): Promise<number> {
  const today = new Date();
  if (startDate >= today) return 0;

  try {
    const rows = await fetchHistoricalPrices(symbol, startDate, today);
    for (const row of rows) {
      await cachePrice(row.symbol, row.date, row.price);
    }
    return rows.length;
  } catch {
    return 0;
  }
}
