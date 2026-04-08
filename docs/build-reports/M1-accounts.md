# M1: Accounts -- Build Report

## Prerequisites

- M0 completed: MariaDB running, Drizzle schema pushed, shadcn initialized, app shell with sidebar, QueryProvider active
- `accounts` table exists with columns: id, name, type, currency, initial_balance, is_active, created_at, updated_at
- Categories seeded

## Goal

Full CRUD for bank/investment accounts. Display account balances. First real feature module.

---

## Task 1: Zod Schemas

### `home-budget-web/lib/validators/accounts.ts`

```typescript
import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["checking", "savings", "investment", "credit_card"]),
  currency: z.string().length(3).default("EUR"),
  initialBalance: z.number().int(), // cents
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
```

---

## Task 2: Query Functions

### `home-budget-web/lib/queries/accounts.ts`

```typescript
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

// Get all active accounts
export async function getAccounts() {
  return db.query.accounts.findMany({
    where: eq(accounts.isActive, true),
    orderBy: accounts.name,
  });
}

// Get single account by ID
export async function getAccountById(id: number) {
  return db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
}

// Get account balance: initial_balance + SUM(transactions.amount)
export async function getAccountBalance(accountId: number): Promise<number> {
  const account = await getAccountById(accountId);
  if (!account) throw new Error("Account not found");

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  return account.initialBalance + (result?.total ?? 0);
}

// Get all accounts with their balances
export async function getAccountsWithBalances() {
  const allAccounts = await getAccounts();
  return Promise.all(
    allAccounts.map(async (account) => ({
      ...account,
      balance: await getAccountBalance(account.id),
    }))
  );
}
```

**Acceptance:**

- `getAccounts()` returns array of active accounts
- `getAccountBalance(id)` returns `initialBalance` when no transactions exist
- `getAccountsWithBalances()` returns accounts with balance field

---

## Task 3: Server Actions

### `home-budget-web/lib/actions/accounts.ts`

```typescript
"use server";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAccountSchema, updateAccountSchema } from "@/lib/validators/accounts";
import { revalidatePath } from "next/cache";

export async function createAccount(input: unknown) {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  const [result] = await db.insert(accounts).values(parsed.data).$returningId();
  revalidatePath("/(dashboard)/accounts");
  return { success: true, data: { id: result.id } };
}

export async function updateAccount(id: number, input: unknown) {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  await db.update(accounts).set(parsed.data).where(eq(accounts.id, id));
  revalidatePath("/(dashboard)/accounts");
  return { success: true };
}

export async function toggleAccountActive(id: number) {
  const account = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
  if (!account) return { success: false, error: "Not found" };

  await db.update(accounts).set({ isActive: !account.isActive }).where(eq(accounts.id, id));
  revalidatePath("/(dashboard)/accounts");
  return { success: true };
}
```

---

## Task 4: API Routes

### `home-budget-web/app/api/accounts/route.ts`


| Method | Description                            | Request                        | Response                                          |
| ------ | -------------------------------------- | ------------------------------ | ------------------------------------------------- |
| GET    | List all active accounts with balances | -                              | `{ data: AccountWithBalance[] }`                  |
| POST   | Create new account                     | `CreateAccountInput` JSON body | `{ data: { id: number } }` or `{ error: string }` |


### `home-budget-web/app/api/accounts/[id]/route.ts`


| Method | Description                     | Request                        | Response                                     |
| ------ | ------------------------------- | ------------------------------ | -------------------------------------------- |
| GET    | Get single account with balance | -                              | `{ data: AccountWithBalance }` or 404        |
| PUT    | Update account fields           | `UpdateAccountInput` JSON body | `{ data: { success: true } }` or `{ error }` |
| PATCH  | Toggle active/inactive          | -                              | `{ data: { success: true } }`                |


Validate all POST/PUT bodies with Zod. Return 400 with `{ error }` on validation failure.

---

## Task 5: TanStack Query Hooks

### `home-budget-web/hooks/useAccounts.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validators/accounts";

export const accountKeys = {
  all: ["accounts"] as const,
  detail: (id: number) => ["accounts", id] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch account");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create account");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUpdateAccount(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAccountInput) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
    },
  });
}

export function useToggleAccountActive(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/accounts/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to toggle account");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
```

---

## Task 6: Account Form Component

### `home-budget-web/components/forms/AccountForm.tsx`

`"use client"` component using **TanStack Form** + `@tanstack/zod-form-adapter`.

**Fields:**


| Field          | Type   | Component                      | Validation                                                   |
| -------------- | ------ | ------------------------------ | ------------------------------------------------------------ |
| name           | text   | shadcn `Input`                 | Required, max 100 chars                                      |
| type           | select | shadcn `Select`                | Required, one of: checking, savings, investment, credit_card |
| currency       | text   | shadcn `Input`                 | 3-char ISO code, default "EUR"                               |
| initialBalance | number | shadcn `Input` (type="number") | Integer (user enters EUR amount, convert to cents on submit) |


**Behavior:**

- On submit: call `useCreateAccount().mutate()` for new, `useUpdateAccount(id).mutate()` for edit
- On success: show toast (sonner), navigate to `/accounts`
- On error: show field-level errors from Zod

**Props:** `mode: "create" | "edit"`, optional `defaultValues` for edit mode.

---

## Task 7: Account List Page

### `home-budget-web/app/(dashboard)/accounts/page.tsx`

Server Component that shows all accounts with balances.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Accounts                        [+ New Account] │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ │ ING Checking│ │ Savings     │ │ Bolero     │ │
│ │ €2,345.67   │ │ €15,000.00  │ │ €8,234.12  │ │
│ │ checking    │ │ savings     │ │ investment │ │
│ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────┘
```

- Grid of shadcn `Card` components (3 columns desktop, 2 tablet, 1 mobile)
- Each card shows: name, formatted balance (green if positive, red if negative), account type as `Badge`
- Card is clickable -- navigates to `/accounts/[id]`
- "New Account" button (shadcn `Button`) in the header links to `/accounts/new`
- If no accounts yet: empty state card with prompt to create first account

**Data fetching:** Call `getAccountsWithBalances()` directly in the Server Component.

---

## Task 8: Create Account Page

### `home-budget-web/app/(dashboard)/accounts/new/page.tsx`

- Page title: "New Account"
- Renders `<AccountForm mode="create" />`
- shadcn `Card` wrapper around the form

---

## Task 9: Account Detail / Edit Page

### `home-budget-web/app/(dashboard)/accounts/[id]/page.tsx`

Server Component that loads the account, then renders a Client Component for interactivity.

**Layout:**

```
┌────────────────────────────────────────────────┐
│ ← Back    ING Checking              [Edit] [⋮] │
├────────────────────────────────────────────────┤
│ Balance: €2,345.67                              │
│ Type: Checking  |  Currency: EUR                │
│ Initial balance: €1,000.00                      │
│ Created: 08 Apr 2026                            │
├────────────────────────────────────────────────┤
│ Recent Transactions (empty for now -- M2)       │
└────────────────────────────────────────────────┘
```

- Display account details in a shadcn `Card`
- "Edit" button opens the `<AccountForm mode="edit" defaultValues={...} />` (either inline or in a shadcn `Sheet`/`Dialog`)
- Dropdown menu (`⋮`) with "Deactivate Account" option (calls `toggleAccountActive`)
- Placeholder section for "Recent Transactions" (will be populated in M2)

---

## Acceptance Criteria for Entire Module

1. Can create a new account with name, type, currency, initial balance
2. Account list page shows all active accounts as cards with formatted balances
3. Can click into an account to see details
4. Can edit account name, type, currency
5. Can deactivate an account (disappears from list, soft delete)
6. Balance shows `initialBalance` correctly (transactions come in M2)
7. All amounts displayed in Belgian EUR format (€1.234,56)
8. No TypeScript errors, no console errors
9. Mobile responsive (cards stack on small screens)

## Files Created

```
home-budget-web/
├── lib/
│   ├── validators/accounts.ts
│   ├── queries/accounts.ts
│   └── actions/accounts.ts
├── hooks/useAccounts.ts
├── components/forms/AccountForm.tsx
└── app/
    ├── api/accounts/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── (dashboard)/accounts/
        ├── page.tsx
        ├── new/page.tsx
        └── [id]/page.tsx
```

