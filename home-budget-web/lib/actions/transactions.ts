"use server";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validators/transactions";
import { revalidatePath } from "next/cache";

export async function createTransaction(input: unknown) {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.flatten() };

  const [result] = await db
    .insert(transactions)
    .values({
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId ?? null,
      date: parsed.data.date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
    })
    .$returningId();

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { success: true as const, data: { id: result.id } };
}

export async function updateTransaction(id: number, input: unknown) {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.flatten() };

  const existing = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
  if (!existing) return { success: false as const, error: "Not found" };

  const { categoryId, notes, ...rest } = parsed.data;
  const values = {
    ...rest,
    ...(categoryId !== undefined && { categoryId: categoryId ?? null }),
    ...(notes !== undefined && { notes: notes ?? null }),
  };

  await db.update(transactions).set(values).where(eq(transactions.id, id));

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { success: true as const };
}

export async function deleteTransaction(id: number) {
  const existing = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
  if (!existing) return { success: false as const, error: "Not found" };

  await db.delete(transactions).where(eq(transactions.id, id));

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { success: true as const };
}
