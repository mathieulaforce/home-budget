import { db } from "@/lib/db";
import { transactions, categories, accounts } from "@/lib/db/schema";
import { eq, and, gte, lte, lt, sql, inArray, or, isNull, ne } from "drizzle-orm";
import type {
  BenchmarkRegion,
  HouseholdSize,
  BenchmarkComparisonRow,
  BenchmarkResult,
} from "@/lib/domain/comparisons/types";
import { applyMultipliers, computeRating } from "@/lib/domain/comparisons/benchmarkService";
import { belgiumBenchmarks, BENCHMARK_REFERENCE_YEAR } from "@/lib/benchmarks/data";
import { mapToBenchmarkGroup } from "@/lib/benchmarks/categoryMapping";
import { getMonthRange } from "@/lib/domain/comparisons/comparisonService";

export async function getHouseholdComparison(
  region: BenchmarkRegion,
  householdSize: HouseholdSize,
  months: number,
  year: number,
  month: number
): Promise<BenchmarkResult> {
  const endRange = getMonthRange(year, month);

  let startYear = year;
  let startMonth = month - months + 1;
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }
  const startRange = getMonthRange(startYear, startMonth);

  const activeIds = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.isActive, true));

  const accountIds = activeIds.map((r) => r.id);
  if (accountIds.length === 0) {
    return {
      rows: belgiumBenchmarks.map((b) => ({
        categoryGroup: b.categoryGroup,
        userMonthly: 0,
        benchmarkMonthly: applyMultipliers(b.averageMonthly, region, householdSize),
        difference: -applyMultipliers(b.averageMonthly, region, householdSize),
        differencePercent: -100,
        rating: "below" as const,
      })),
      region,
      householdSize,
      months,
      referenceYear: BENCHMARK_REFERENCE_YEAR,
    };
  }

  const rows = await db
    .select({
      groupName: sql<string>`COALESCE(${categories.groupName}, 'Other')`,
      total: sql<number>`SUM(ABS(${transactions.amount}))`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        inArray(transactions.accountId, accountIds),
        gte(transactions.date, startRange.start),
        lte(transactions.date, endRange.end),
        lt(transactions.amount, 0),
        or(isNull(categories.name), ne(categories.name, "Savings Transfer"))
      )
    )
    .groupBy(categories.groupName);

  const userByGroup = new Map<string, number>();
  for (const row of rows) {
    const benchmarkGroup = mapToBenchmarkGroup(row.groupName);
    if (benchmarkGroup) {
      const existing = userByGroup.get(benchmarkGroup) ?? 0;
      userByGroup.set(benchmarkGroup, existing + Number(row.total));
    }
  }

  const comparisonRows: BenchmarkComparisonRow[] = belgiumBenchmarks.map((b) => {
    const userTotal = userByGroup.get(b.categoryGroup) ?? 0;
    const userMonthly = Math.round(userTotal / months);
    const benchmarkMonthly = applyMultipliers(b.averageMonthly, region, householdSize);
    const difference = userMonthly - benchmarkMonthly;
    const differencePercent =
      benchmarkMonthly !== 0 ? (difference / benchmarkMonthly) * 100 : null;
    const rating = computeRating(userMonthly, benchmarkMonthly);

    return {
      categoryGroup: b.categoryGroup,
      userMonthly,
      benchmarkMonthly,
      difference,
      differencePercent,
      rating,
    };
  });

  return {
    rows: comparisonRows,
    region,
    householdSize,
    months,
    referenceYear: BENCHMARK_REFERENCE_YEAR,
  };
}
