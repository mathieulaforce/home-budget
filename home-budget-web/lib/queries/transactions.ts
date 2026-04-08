import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { eq, and, like, gte, lte, sql, asc, desc } from "drizzle-orm";
import type { TransactionFilters } from "@/lib/validators/transactions";
import type {
  TransactionRow,
  PaginatedResult,
} from "@/lib/domain/transactions/types";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const sortColumns = {
  date: transactions.date,
  amount: transactions.amount,
  description: transactions.description,
} as const;

export async function getTransactions(
  filters: TransactionFilters
): Promise<PaginatedResult<TransactionRow>> {
  const conditions = [];

  if (filters.accountId !== undefined) {
    conditions.push(eq(transactions.accountId, filters.accountId));
  }
  if (filters.categoryId !== undefined) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters.startDate) {
    conditions.push(gte(transactions.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(transactions.date, filters.endDate));
  }
  if (filters.search) {
    conditions.push(like(transactions.description, `%${escapeLike(filters.search)}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol = sortColumns[filters.sortBy];
  const orderFn = filters.sortOrder === "asc" ? asc : desc;

  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryGroup: categories.groupName,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        notes: transactions.notes,
        importHash: transactions.importHash,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(where),
  ]);

  return {
    data: rows.map((r) => ({
      ...r,
      date: new Date(r.date),
      createdAt: new Date(r.createdAt),
    })),
    total: Number(countResult[0].count),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getTransactionById(
  id: number
): Promise<TransactionRow | null> {
  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryGroup: categories.groupName,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      notes: transactions.notes,
      importHash: transactions.importHash,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    ...r,
    date: new Date(r.date),
    createdAt: new Date(r.createdAt),
  };
}
