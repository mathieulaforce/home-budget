import { db } from "@/lib/db";
import {
  budgets,
  budgetItems,
  categories,
  transactions,
  accounts,
} from "@/lib/db/schema";
import { eq, sql, and, between, isNotNull } from "drizzle-orm";
import type {
  BudgetListItem,
  BudgetDetail,
  BudgetItemDetail,
  BudgetVsActualResult,
  BudgetComparison,
} from "@/lib/domain/budgets/types";
import {
  getPeriodDateRange,
  computeVariance,
  computeVariancePercent,
} from "@/lib/domain/budgets/service";

export async function getBudgets(): Promise<BudgetListItem[]> {
  const rows = await db
    .select({
      id: budgets.id,
      year: budgets.year,
      month: budgets.month,
      name: budgets.name,
      totalPlanned: sql<number>`COALESCE(SUM(${budgetItems.plannedAmount}), 0)`,
      createdAt: budgets.createdAt,
    })
    .from(budgets)
    .leftJoin(budgetItems, eq(budgetItems.budgetId, budgets.id))
    .groupBy(budgets.id)
    .orderBy(budgets.year, budgets.month);

  return rows.map((r) => ({
    ...r,
    totalPlanned: Number(r.totalPlanned),
  }));
}

export async function getBudgetWithItems(
  id: number
): Promise<BudgetDetail | null> {
  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });
  if (!budget) return null;

  const items = await db
    .select({
      id: budgetItems.id,
      categoryId: budgetItems.categoryId,
      categoryName: categories.name,
      groupName: categories.groupName,
      isIncome: categories.isIncome,
      plannedAmount: budgetItems.plannedAmount,
      sortOrder: categories.sortOrder,
    })
    .from(budgetItems)
    .innerJoin(categories, eq(categories.id, budgetItems.categoryId))
    .where(eq(budgetItems.budgetId, id))
    .orderBy(categories.sortOrder);

  return {
    id: budget.id,
    year: budget.year,
    month: budget.month,
    name: budget.name,
    items: items as BudgetItemDetail[],
  };
}

export async function getBudgetVsActual(
  id: number
): Promise<BudgetVsActualResult | null> {
  const budget = await getBudgetWithItems(id);
  if (!budget) return null;

  const { start, end } = getPeriodDateRange(budget.year, budget.month);

  const actuals = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        isNotNull(transactions.categoryId),
        eq(accounts.isActive, true),
        between(transactions.date, start, end)
      )
    )
    .groupBy(transactions.categoryId);

  const actualMap = new Map(
    actuals.map((a) => [a.categoryId!, Number(a.total)])
  );

  const comparisons: BudgetComparison[] = budget.items.map((item) => {
    const actual = actualMap.get(item.categoryId) ?? 0;
    return {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      groupName: item.groupName,
      isIncome: item.isIncome,
      planned: item.plannedAmount,
      actual,
      variance: computeVariance(item.plannedAmount, actual),
      variancePercent: computeVariancePercent(item.plannedAmount, actual),
    };
  });

  const totalPlanned = comparisons.reduce((s, c) => s + c.planned, 0);
  const totalActual = comparisons.reduce((s, c) => s + c.actual, 0);
  const totalVariance = computeVariance(totalPlanned, totalActual);

  return {
    budget,
    comparisons,
    totalPlanned,
    totalActual,
    totalVariance,
  };
}
