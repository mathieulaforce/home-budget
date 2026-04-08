import { z } from "zod";

export const addHoldingSchema = z.object({
  accountId: z.number().int().positive("Account is required"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(20)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required").max(200),
  shares: z.number().positive("Shares must be positive"),
  costBasis: z.number().int().positive("Cost must be positive"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const updateHoldingSchema = addHoldingSchema.partial();

export type AddHoldingInput = z.infer<typeof addHoldingSchema>;
export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>;
