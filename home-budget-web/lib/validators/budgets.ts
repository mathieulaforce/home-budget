import { z } from "zod";

export const budgetItemSchema = z.object({
  categoryId: z.number().int().positive("Category is required"),
  plannedAmount: z.number().int().nonnegative("Planned amount must be ≥ 0"),
});

export const createBudgetSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12).nullable(),
    name: z.string().min(1, "Name is required").max(100),
    items: z.array(budgetItemSchema).min(1, "At least one budget item is required"),
  })
  .refine(
    (data) => {
      const ids = data.items.map((i) => i.categoryId);
      return new Set(ids).size === ids.length;
    },
    { message: "Duplicate categories are not allowed", path: ["items"] }
  );

export const updateBudgetItemSchema = z.object({
  plannedAmount: z.number().int().nonnegative("Planned amount must be ≥ 0"),
});

export const duplicateBudgetSchema = z.object({
  targetYear: z.number().int().min(2000).max(2100),
  targetMonth: z.number().int().min(1).max(12).nullable(),
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
export type DuplicateBudgetInput = z.infer<typeof duplicateBudgetSchema>;
