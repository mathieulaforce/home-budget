import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["checking", "savings", "investment", "credit_card"]),
  currency: z.string().regex(/^[A-Z]{3}$/, "Must be a 3-letter currency code").default("EUR"),
  initialBalance: z.number().int(),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
