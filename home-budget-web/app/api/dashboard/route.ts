import { NextRequest, NextResponse } from "next/server";
import { periodToRange, previousPeriod } from "@/lib/domain/shared/types";
import type { PeriodSelection } from "@/lib/domain/shared/types";
import {
  getDashboardSummary,
  getSpendingByCategory,
  getMonthlyTrend,
  getRecentTransactions,
  getBudgetByCategory,
} from "@/lib/queries/dashboard";

function parsePeriod(params: URLSearchParams): PeriodSelection {
  const type = params.get("type") ?? "month";
  const now = new Date();

  if (type === "year") {
    const year = Number(params.get("year")) || now.getFullYear();
    return { type: "year", year };
  }

  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  return { type: "month", year, month };
}

export async function GET(request: NextRequest) {
  try {
    const selection = parsePeriod(request.nextUrl.searchParams);
    const range = periodToRange(selection);
    const prevSelection = previousPeriod(selection);
    const prevRange = periodToRange(prevSelection);

    const [summary, previousSummary, spendingByCategory, monthlyTrend, recentTransactions, budgetByCategory] =
      await Promise.all([
        getDashboardSummary(range),
        getDashboardSummary(prevRange),
        getSpendingByCategory(range),
        getMonthlyTrend(12),
        getRecentTransactions(10),
        getBudgetByCategory(range),
      ]);

    return NextResponse.json({
      data: {
        summary,
        previousSummary,
        spendingByCategory,
        monthlyTrend,
        recentTransactions,
        budgetByCategory,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
