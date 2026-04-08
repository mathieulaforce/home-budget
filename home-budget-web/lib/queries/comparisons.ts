import { db } from "@/lib/db";
import { transactions, categories, accounts } from "@/lib/db/schema";
import { eq, and, gte, lte, lt, sql, inArray, or, isNull, ne } from "drizzle-orm";
import type { ComparisonType } from "@/lib/domain/comparisons/types";
import type { ComparisonResult } from "@/lib/domain/comparisons/types";
import type { CategoryTotal, DateRange } from "@/lib/domain/comparisons/comparisonService";
import {
  getMonthRange,
  previousMonth,
  sameMonthLastYear,
  mergeCategoryTotals,
  computeChange,
  formatMonthLabel,
} from "@/lib/domain/comparisons/comparisonService";

async function getActiveAccountIds(): Promise<number[]> {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.isActive, true));
  return rows.map((r) => r.id);
}

export async function getSpendingByCategory(
  range: DateRange
): Promise<Map<string, CategoryTotal>> {
  const activeIds = await getActiveAccountIds();
  if (activeIds.length === 0) return new Map();

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      groupName: sql<string>`COALESCE(${categories.groupName}, 'Other')`,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        inArray(transactions.accountId, activeIds),
        gte(transactions.date, range.start),
        lte(transactions.date, range.end),
        lt(transactions.amount, 0),
        or(isNull(categories.name), ne(categories.name, "Savings Transfer"))
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.groupName);

  const map = new Map<string, CategoryTotal>();
  for (const row of rows) {
    const key = row.categoryName;
    map.set(key, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      groupName: row.groupName,
      total: Math.abs(Number(row.total)),
    });
  }
  return map;
}

export async function getPeriodComparison(
  type: ComparisonType,
  year: number,
  month: number
): Promise<ComparisonResult> {
  const currentRange = getMonthRange(year, month);
  const prev = type === "mom" ? previousMonth(year, month) : sameMonthLastYear(year, month);
  const previousRange = getMonthRange(prev.year, prev.month);

  const [currentMap, previousMap] = await Promise.all([
    getSpendingByCategory(currentRange),
    getSpendingByCategory(previousRange),
  ]);

  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const rows = mergeCategoryTotals(currentMap, previousMap, allKeys);

  const currentTotal = rows.reduce((sum, r) => sum + r.currentPeriod, 0);
  const previousTotal = rows.reduce((sum, r) => sum + r.previousPeriod, 0);
  const { change: totalChange, changePercent: totalChangePercent } = computeChange(
    currentTotal,
    previousTotal
  );

  return {
    rows,
    currentTotal,
    previousTotal,
    totalChange,
    totalChangePercent,
    currentLabel: formatMonthLabel(year, month),
    previousLabel: formatMonthLabel(prev.year, prev.month),
  };
}
