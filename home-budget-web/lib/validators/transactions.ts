import { z } from "zod";

export const createTransactionSchema = z.object({
  accountId: z.number().int(),
  categoryId: z.number().int().nullable().optional(),
  date: z.coerce.date(),
  description: z.string().min(1, "Description is required").max(500),
  amount: z.number().int(),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFiltersSchema = z.object({
  accountId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
