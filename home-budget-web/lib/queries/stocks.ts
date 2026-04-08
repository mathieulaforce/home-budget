import { db } from "@/lib/db";
import { stockHoldings, stockPrices, accounts } from "@/lib/db/schema";
import { eq, sql, gte } from "drizzle-orm";
import type { HoldingSummary, PortfolioHistoryPoint } from "@/lib/domain/stocks/types";
import {
  calculateHoldingMetrics,
  buildPortfolioSummary,
  isStalePrice,
} from "@/lib/domain/stocks/service";
import { toISODate } from "@/lib/utils/formatDate";

export async function getHoldings(): Promise<HoldingSummary[]> {
  const latestPriceSq = db
    .select({
      symbol: stockPrices.symbol,
      price: sql<number>`${stockPrices.price}`.as("lp_price"),
      date: sql<Date | string>`${stockPrices.date}`.as("lp_date"),
    })
    .from(stockPrices)
    .where(
      sql`(${stockPrices.symbol}, ${stockPrices.date}) IN (
        SELECT symbol, MAX(date) FROM stock_prices GROUP BY symbol
      )`
    )
    .as("lp");

  const rows = await db
    .select({
      id: stockHoldings.id,
      accountId: stockHoldings.accountId,
      accountName: accounts.name,
      symbol: stockHoldings.symbol,
      name: stockHoldings.name,
      shares: stockHoldings.shares,
      costBasis: stockHoldings.costBasis,
      purchaseDate: stockHoldings.purchaseDate,
      latestPrice: latestPriceSq.price,
      priceDate: latestPriceSq.date,
    })
    .from(stockHoldings)
    .innerJoin(accounts, eq(accounts.id, stockHoldings.accountId))
    .leftJoin(latestPriceSq, eq(latestPriceSq.symbol, stockHoldings.symbol));

  return rows.map((r) => {
    const shares = parseFloat(r.shares as unknown as string);
    const latestPrice = r.latestPrice ?? null;
    const rawPriceDate = r.priceDate ?? null;
    const priceDate = rawPriceDate instanceof Date
      ? toISODate(rawPriceDate)
      : rawPriceDate;
    const { currentValue, gainLoss, returnPercent } = calculateHoldingMetrics(
      shares,
      r.costBasis,
      latestPrice
    );

    return {
      id: r.id,
      accountId: r.accountId,
      accountName: r.accountName,
      symbol: r.symbol,
      name: r.name,
      shares,
      costBasis: r.costBasis,
      latestPrice,
      priceDate,
      currentValue,
      gainLoss,
      returnPercent,
      allocationPercent: null,
      purchaseDate: r.purchaseDate instanceof Date
        ? toISODate(r.purchaseDate)
        : String(r.purchaseDate),
      isStale: isStalePrice(rawPriceDate),
    };
  });
}

export async function getHoldingById(id: number) {
  const row = await db.query.stockHoldings.findFirst({
    where: eq(stockHoldings.id, id),
  });
  if (!row) return null;
  return {
    ...row,
    shares: parseFloat(row.shares as unknown as string),
  };
}

export async function getPortfolioSummaryData() {
  const holdings = await getHoldings();
  return buildPortfolioSummary(holdings);
}

export async function getPortfolioHistory(
  months: number
): Promise<PortfolioHistoryPoint[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const rows = await db
    .select({
      date: stockPrices.date,
      valueCents: sql<number>`SUM(
        CAST(sh.shares AS DECIMAL(16,6)) * ${stockPrices.price}
      )`,
    })
    .from(stockPrices)
    .innerJoin(
      sql`stock_holdings sh`,
      sql`sh.symbol = ${stockPrices.symbol}
        AND sh.purchase_date <= ${stockPrices.date}`
    )
    .where(gte(stockPrices.date, since))
    .groupBy(stockPrices.date)
    .orderBy(stockPrices.date);

  return rows.map((r) => ({
    date: r.date instanceof Date ? toISODate(r.date) : String(r.date),
    valueCents: Math.round(Number(r.valueCents) || 0),
  }));
}

export async function getDistinctSymbols(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ symbol: stockHoldings.symbol })
    .from(stockHoldings);
  return rows.map((r) => r.symbol);
}
