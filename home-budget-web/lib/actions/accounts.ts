"use server";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validators/accounts";
import { revalidatePath } from "next/cache";

export async function createAccount(input: unknown) {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  const [result] = await db.insert(accounts).values(parsed.data).$returningId();
  revalidatePath("/accounts");
  return { success: true as const, data: { id: result.id } };
}

export async function updateAccount(id: number, input: unknown) {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
  if (!existing) return { success: false as const, error: "Not found" };

  await db.update(accounts).set(parsed.data).where(eq(accounts.id, id));
  revalidatePath("/accounts");
  return { success: true as const };
}

export async function toggleAccountActive(id: number) {
  const result = await db
    .update(accounts)
    .set({ isActive: sql`NOT ${accounts.isActive}` })
    .where(eq(accounts.id, id));

  if (result[0].affectedRows === 0) {
    return { success: false as const, error: "Not found" };
  }

  revalidatePath("/accounts");
  return { success: true as const };
}
