import { db } from "@/lib/db";
import {
  accounts,
  transactions,
  categories,
  budgets,
  budgetItems,
} from "@/lib/db/schema";
import { eq, and, between, sql, desc, lt, lte } from "drizzle-orm";
import type { DateRange } from "@/lib/domain/shared/types";
import type {
  DashboardSummary,
  CategorySpending,
  MonthlyTrend,
  TransactionRow,
  BudgetCategoryStatus,
} from "@/lib/domain/dashboard/types";

export async function getDashboardSummary(
  range: DateRange
): Promise<DashboardSummary> {
  const accountRows = await db
    .select({
      initialBalance: accounts.initialBalance,
      txTotal: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(
      transactions,
      and(
        eq(transactions.accountId, accounts.id),
        lte(transactions.date, range.end)
      )
    )
    .where(eq(accounts.isActive, true))
    .groupBy(accounts.id);

  const netWorth = accountRows.reduce(
    (sum, r) => sum + r.initialBalance + Number(r.txTotal),
    0
  );

  const [spendRow] = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        between(transactions.date, range.start, range.end),
        lt(transactions.amount, 0)
      )
    );

  const totalSpend = Number(spendRow?.totalSpend ?? 0);

  const [incomeRow] = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        between(transactions.date, range.start, range.end),
        sql`${transactions.amount} > 0`
      )
    );

  const totalIncome = Number(incomeRow?.totalIncome ?? 0);
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalSpend) / totalIncome) * 100)
      : 0;

  const startYear = range.start.getFullYear();
  const startMonth = range.start.getMonth() + 1;
  const endYear = range.end.getFullYear();
  const endMonth = range.end.getMonth() + 1;

  const budgetRow = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.year, startYear),
      startYear === endYear && startMonth === endMonth
        ? eq(budgets.month, startMonth)
        : sql`${budgets.month} IS NULL`
    ),
  });

  let budgetStatus: DashboardSummary["budgetStatus"] = null;

  if (budgetRow) {
    const [planRow] = await db
      .select({
        planned: sql<number>`COALESCE(SUM(${budgetItems.plannedAmount}), 0)`,
      })
      .from(budgetItems)
      .where(eq(budgetItems.budgetId, budgetRow.id));

    const planned = Number(planRow?.planned ?? 0);
    budgetStatus = {
      planned,
      actual: totalSpend,
      variance: planned - totalSpend,
    };
  }

  return { netWorth, totalSpend, savingsRate, budgetStatus };
}

export async function getSpendingByCategory(
  range: DateRange
): Promise<CategorySpending[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      groupName: sql<string>`COALESCE(${categories.groupName}, 'Other')`,
      total: sql<number>`SUM(ABS(${transactions.amount}))`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        between(transactions.date, range.start, range.end),
        lt(transactions.amount, 0)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.groupName)
    .orderBy(sql`total DESC`);

  const totalAll = rows.reduce((s, r) => s + Number(r.total), 0);

  const top6 = rows.slice(0, 6).map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    groupName: r.groupName,
    total: Number(r.total),
    percentage: totalAll > 0 ? Math.round((Number(r.total) / totalAll) * 100) : 0,
  }));

  if (rows.length > 6) {
    const otherTotal = rows
      .slice(6)
      .reduce((s, r) => s + Number(r.total), 0);
    top6.push({
      categoryId: null,
      categoryName: "Other",
      groupName: "Other",
      total: otherTotal,
      percentage: totalAll > 0 ? Math.round((otherTotal / totalAll) * 100) : 0,
    });
  }

  return top6;
}

export async function getMonthlyTrend(months = 12): Promise<MonthlyTrend[]> {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const rows = await db
    .select({
      yr: sql<number>`YEAR(${transactions.date})`,
      mo: sql<number>`MONTH(${transactions.date})`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.date} >= ${cutoff}`)
    .groupBy(sql`YEAR(${transactions.date})`, sql`MONTH(${transactions.date})`)
    .orderBy(sql`yr`, sql`mo`);

  const dataMap = new Map(
    rows.map((r) => [
      `${r.yr}-${String(r.mo).padStart(2, "0")}`,
      { income: Number(r.income), expenses: Number(r.expenses) },
    ])
  );

  const result: MonthlyTrend[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(cutoff.getFullYear(), cutoff.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = dataMap.get(key);
    const income = entry?.income ?? 0;
    const expenses = entry?.expenses ?? 0;
    result.push({ month: key, income, expenses, net: income - expenses });
  }

  return result;
}

export async function getRecentTransactions(
  limit = 10
): Promise<TransactionRow[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    description: r.description,
    amount: r.amount,
    accountName: r.accountName,
    categoryName: r.categoryName ?? null,
  }));
}

export async function getBudgetByCategory(
  range: DateRange
): Promise<BudgetCategoryStatus[]> {
  const startYear = range.start.getFullYear();
  const startMonth = range.start.getMonth() + 1;
  const endYear = range.end.getFullYear();
  const endMonth = range.end.getMonth() + 1;

  const budgetRow = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.year, startYear),
      startYear === endYear && startMonth === endMonth
        ? eq(budgets.month, startMonth)
        : sql`${budgets.month} IS NULL`
    ),
  });

  if (!budgetRow) return [];

  const items = await db
    .select({
      categoryId: budgetItems.categoryId,
      categoryName: categories.name,
      planned: budgetItems.plannedAmount,
    })
    .from(budgetItems)
    .innerJoin(categories, eq(budgetItems.categoryId, categories.id))
    .where(eq(budgetItems.budgetId, budgetRow.id))
    .orderBy(desc(budgetItems.plannedAmount))
    .limit(5);

  const categoryIds = items.map((i) => i.categoryId);
  if (categoryIds.length === 0) return [];

  const actuals = await db
    .select({
      categoryId: transactions.categoryId,
      actual: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        between(transactions.date, range.start, range.end),
        lt(transactions.amount, 0),
        sql`${transactions.categoryId} IN (${sql.join(
          categoryIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    )
    .groupBy(transactions.categoryId);

  const actualMap = new Map(
    actuals.map((a) => [a.categoryId, Number(a.actual)])
  );

  return items.map((i) => ({
    categoryName: i.categoryName,
    planned: i.planned,
    actual: actualMap.get(i.categoryId) ?? 0,
  }));
}
