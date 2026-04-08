"use server";

import { db } from "@/lib/db";
import { budgets, budgetItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createBudgetSchema,
  updateBudgetItemSchema,
  duplicateBudgetSchema,
} from "@/lib/validators/budgets";
import { revalidatePath } from "next/cache";

export async function createBudget(input: unknown) {
  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.flatten() };

  const { name, year, month, items } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(budgets)
      .values({ name, year, month })
      .$returningId();

    await tx.insert(budgetItems).values(
      items.map((item) => ({
        budgetId: inserted.id,
        categoryId: item.categoryId,
        plannedAmount: item.plannedAmount,
      }))
    );

    return inserted.id;
  });

  revalidatePath("/budgets");
  return { success: true as const, data: { id: result } };
}

export async function updateBudgetItem(
  budgetId: number,
  itemId: number,
  input: unknown
) {
  const parsed = updateBudgetItemSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.flatten() };

  const existing = await db.query.budgetItems.findFirst({
    where: eq(budgetItems.id, itemId),
  });
  if (!existing || existing.budgetId !== budgetId)
    return { success: false as const, error: "Budget item not found" };

  await db
    .update(budgetItems)
    .set({ plannedAmount: parsed.data.plannedAmount })
    .where(eq(budgetItems.id, itemId));

  revalidatePath("/budgets");
  return { success: true as const };
}

export async function deleteBudget(id: number) {
  const existing = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });
  if (!existing) return { success: false as const, error: "Budget not found" };

  await db.transaction(async (tx) => {
    await tx.delete(budgetItems).where(eq(budgetItems.budgetId, id));
    await tx.delete(budgets).where(eq(budgets.id, id));
  });

  revalidatePath("/budgets");
  return { success: true as const };
}

export async function duplicateBudget(id: number, input: unknown) {
  const parsed = duplicateBudgetSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.flatten() };

  const source = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });
  if (!source)
    return { success: false as const, error: "Source budget not found" };

  const sourceItems = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budgetId, id),
  });

  const { name, targetYear, targetMonth } = parsed.data;

  const newId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(budgets)
      .values({ name, year: targetYear, month: targetMonth })
      .$returningId();

    if (sourceItems.length > 0) {
      await tx.insert(budgetItems).values(
        sourceItems.map((item) => ({
          budgetId: inserted.id,
          categoryId: item.categoryId,
          plannedAmount: item.plannedAmount,
        }))
      );
    }

    return inserted.id;
  });

  revalidatePath("/budgets");
  return { success: true as const, data: { id: newId } };
}
