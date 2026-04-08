import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getAccounts() {
  return db.query.accounts.findMany({
    where: eq(accounts.isActive, true),
    orderBy: accounts.name,
  });
}

export async function getAccountById(id: number) {
  return db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
}

export async function getTransactionTotal(accountId: number): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  return Number(result?.total) || 0;
}

export async function getAccountBalance(accountId: number): Promise<number> {
  const account = await getAccountById(accountId);
  if (!account) throw new Error("Account not found");

  const txTotal = await getTransactionTotal(accountId);
  return account.initialBalance + txTotal;
}

export async function getAccountsWithBalances() {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      initialBalance: accounts.initialBalance,
      isActive: accounts.isActive,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      txTotal: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.isActive, true))
    .groupBy(accounts.id)
    .orderBy(accounts.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    initialBalance: r.initialBalance,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    balance: r.initialBalance + Number(r.txTotal),
  }));
}
