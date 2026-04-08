"use server";

import { db } from "@/lib/db";
import { stockHoldings, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addHoldingSchema, updateHoldingSchema } from "@/lib/validators/stocks";
import { backfillPrices, refreshAllPrices } from "@/lib/stocks/prices";
import { getDistinctSymbols } from "@/lib/queries/stocks";

export async function addHolding(input: unknown) {
  const parsed = addHoldingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, parsed.data.accountId),
  });
  if (!account || account.type !== "investment") {
    return { success: false as const, error: "Account must be an investment account" };
  }

  const [result] = await db
    .insert(stockHoldings)
    .values({
      accountId: parsed.data.accountId,
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      shares: String(parsed.data.shares),
      costBasis: parsed.data.costBasis,
      purchaseDate: new Date(parsed.data.purchaseDate),
    })
    .$returningId();

  try {
    await backfillPrices(parsed.data.symbol, new Date(parsed.data.purchaseDate));
  } catch {
    // Non-critical: price backfill can fail silently
  }

  revalidatePath("/stocks");
  return { success: true as const, data: { id: result.id } };
}

export async function updateHolding(id: number, input: unknown) {
  const parsed = updateHoldingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const existing = await db.query.stockHoldings.findFirst({
    where: eq(stockHoldings.id, id),
  });
  if (!existing) {
    return { success: false as const, error: "Holding not found" };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.accountId !== undefined) updates.accountId = parsed.data.accountId;
  if (parsed.data.symbol !== undefined) updates.symbol = parsed.data.symbol;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.shares !== undefined) updates.shares = String(parsed.data.shares);
  if (parsed.data.costBasis !== undefined) updates.costBasis = parsed.data.costBasis;
  if (parsed.data.purchaseDate !== undefined) {
    updates.purchaseDate = new Date(parsed.data.purchaseDate);
  }

  if (Object.keys(updates).length > 0) {
    await db.update(stockHoldings).set(updates).where(eq(stockHoldings.id, id));
  }

  revalidatePath("/stocks");
  return { success: true as const };
}

export async function deleteHolding(id: number) {
  const existing = await db.query.stockHoldings.findFirst({
    where: eq(stockHoldings.id, id),
  });
  if (!existing) {
    return { success: false as const, error: "Holding not found" };
  }

  await db.delete(stockHoldings).where(eq(stockHoldings.id, id));
  revalidatePath("/stocks");
  return { success: true as const };
}

export async function refreshPrices() {
  const symbols = await getDistinctSymbols();
  if (symbols.length === 0) {
    return { success: true as const, data: { refreshed: 0, failed: [] } };
  }

  const result = await refreshAllPrices(symbols);
  revalidatePath("/stocks");
  return { success: true as const, data: result };
}
