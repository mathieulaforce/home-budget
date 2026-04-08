import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import type { CategorySummary } from "@/lib/domain/transactions/types";

export async function getCategories(): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      groupName: categories.groupName,
      icon: categories.icon,
      isIncome: categories.isIncome,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(categories.sortOrder, categories.name);

  return rows;
}
