"use server";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validators/accounts";
import { revalidatePath } from "next/cache";

type AccountType = "checking" | "savings" | "investment" | "credit_card";

async function isDuplicateAccount(
  name: string,
  type: AccountType,
  excludeId?: number
) {
  const conditions = [eq(accounts.name, name), eq(accounts.type, type)];
  if (excludeId !== undefined) conditions.push(ne(accounts.id, excludeId));

  const existing = await db.query.accounts.findFirst({
    where: and(...conditions),
  });
  return !!existing;
}

export async function createAccount(input: unknown) {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  if (await isDuplicateAccount(parsed.data.name, parsed.data.type)) {
    return { success: false as const, error: "An account with this name and type already exists" };
  }

  const [result] = await db.insert(accounts).values(parsed.data).$returningId();
  revalidatePath("/accounts");
  return { success: true as const, data: { id: result.id } };
}

export async function updateAccount(id: number, input: unknown) {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
  if (!existing) return { success: false as const, error: "Not found" };

  const name = parsed.data.name ?? existing.name;
  const type = parsed.data.type ?? existing.type;
  if (await isDuplicateAccount(name, type, id)) {
    return { success: false as const, error: "An account with this name and type already exists" };
  }

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
