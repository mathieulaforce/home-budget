# M0: Foundation -- Build Report

## Prerequisites

- Empty workspace at `home-budget/` with a fresh Next.js 16 starter in `home-budget-web/`
- Docker installed locally
- Node.js 20.9+

## Goal

Set up all infrastructure so that subsequent modules can immediately start building features: database, ORM, app shell, providers, base utilities.

---

## Task 1: Git Init + Workspace Root Files

**Files to create:**

### `home-budget/.gitignore`

```gitignore
node_modules/
.next/
.env
.env.local
.env*.local
*.log
.DS_Store
```

### `home-budget/docker-compose.yml`

```yaml
services:
  mariadb:
    image: mariadb:11
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-rootpassword}
      MARIADB_DATABASE: home_budget
      MARIADB_USER: budget_user
      MARIADB_PASSWORD: ${DB_PASSWORD:-budgetpass}
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mariadb_data:
```

### `home-budget/.env`

```env
DB_ROOT_PASSWORD=rootpassword
DB_PASSWORD=budgetpass
```

**Commands:**

```bash
cd home-budget
git init
docker compose up -d
```

**Acceptance:**
- `git status` works at `home-budget/`
- `docker compose ps` shows mariadb running and healthy
- Can connect: `docker exec -it home-budget-mariadb-1 mariadb -ubudget_user -pbudgetpass home_budget`

---

## Task 2: Install Dependencies

**Working directory:** `home-budget-web/`

```bash
# Database
npm install drizzle-orm mysql2
npm install -D drizzle-kit

# Validation
npm install zod

# TanStack
npm install @tanstack/react-query @tanstack/react-table @tanstack/react-form @tanstack/react-virtual @tanstack/zod-form-adapter

# shadcn/ui init (interactive -- pick defaults, New York style, CSS variables: yes)
npx shadcn@latest init

# Add core shadcn components
npx shadcn@latest add button card input select table dialog sheet tabs sidebar separator badge dropdown-menu toast sonner

# Add shadcn charts (installs recharts under the hood)
npx shadcn@latest add chart
```

**Acceptance:**
- All packages in `package.json`
- `components/ui/` populated by shadcn with all listed components
- `lib/utils.ts` exists with `cn()` helper (created by shadcn init)

---

## Task 3: Drizzle Configuration + Schema

### `home-budget-web/.env.local`

```env
DATABASE_URL=mysql://budget_user:budgetpass@localhost:3306/home_budget
```

### `home-budget-web/drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is not set");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl,
  },
});
```

### `home-budget-web/lib/db/index.ts`

Drizzle client singleton. Use `mysql2/promise` pool (not single connection) for concurrent requests.

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is not set");

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 10 });

export const db = drizzle(pool, { schema, mode: "default" });
```

### `home-budget-web/lib/db/schema.ts`

Copy the full schema from `.cursor/skills/financial-data-model/schema-reference.md`. It defines 7 tables:

1. `accounts` -- id, name, type (enum: checking/savings/investment/credit_card), currency, initialBalance, isActive, createdAt, updatedAt
2. `categories` -- id, name, groupName, icon, isIncome, sortOrder
3. `transactions` -- id, accountId (FK → accounts.id), categoryId (FK → categories.id, nullable), date, description, amount (cents), notes, importHash (unique), createdAt; indexes on accountId, categoryId, date
4. `budgets` -- id, year, month (nullable), name, createdAt, updatedAt
5. `budgetItems` -- id, budgetId (FK → budgets.id), categoryId (FK → categories.id), plannedAmount, updatedAt; indexes on budgetId, categoryId
6. `stockHoldings` -- id, accountId (FK → accounts.id), symbol, name, shares (decimal), costBasis, purchaseDate, createdAt; index on accountId
7. `stockPrices` -- id, symbol, date, price; unique index on (symbol, date)

All FK columns use `.references()` for database-level constraints (default RESTRICT on delete). Plus all `relations()` definitions.

**Important**: Adapt file paths from the skill's `src/lib/db/` to `lib/db/` (no `src/` in this project).

**Commands:**

```bash
npx drizzle-kit push
```

**Acceptance:**
- All 7 tables exist in MariaDB: `accounts`, `categories`, `transactions`, `budgets`, `budget_items`, `stock_holdings`, `stock_prices`
- `npx drizzle-kit studio` opens and shows the tables

---

## Task 4: Category Seed Data

### `home-budget-web/lib/db/seed.ts`

Script that inserts default categories. Run with `npx tsx lib/db/seed.ts`.

```typescript
import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories } from "./schema";

const seedCategories = [
  // ... 30 categories (Housing, Food, Transport, Health, Entertainment,
  //     Shopping, Financial, Income, Other) ...
];

async function seed() {
  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    await db.delete(categories);
  } finally {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  }
  await db.insert(categories).values(seedCategories);
  console.log(`Seeded ${seedCategories.length} categories`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Add to `package.json` scripts:
- `"db:seed": "dotenv -e .env.local -- tsx lib/db/seed.ts"`
- `"db:generate": "dotenv -e .env.local -- drizzle-kit generate"`
- `"db:studio": "dotenv -e .env.local -- drizzle-kit studio"`

**Acceptance:**
- Running `npm run db:seed` inserts 30 categories
- Categories are queryable: `SELECT * FROM categories ORDER BY sort_order;`

---

## Task 5: TanStack Query Provider

### `home-budget-web/components/providers/QueryProvider.tsx`

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

Wire into `app/layout.tsx`: wrap `{children}` with `<QueryProvider>`.

**Acceptance:**
- React Query DevTools (optional) shows in browser
- No hydration errors

---

## Task 6: App Shell with shadcn Sidebar

Replace the default Next.js starter page with a dashboard shell.

### `home-budget-web/app/layout.tsx`

- Import `QueryProvider`
- Import shadcn `SidebarProvider` and `Toaster` (sonner)
- Update metadata: title "Home Budget", description
- Wrap children: `<QueryProvider><SidebarProvider><AppSidebar /><main>{children}</main></SidebarProvider></QueryProvider>`

### `home-budget-web/components/layout/AppSidebar.tsx`

Use shadcn `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` components.

Navigation items:

| Label | Icon | Path |
|-------|------|------|
| Overview | LayoutDashboard | `/(dashboard)/overview` |
| Accounts | Wallet | `/(dashboard)/accounts` |
| Transactions | ArrowLeftRight | `/(dashboard)/transactions` |
| Budgets | Target | `/(dashboard)/budgets` |
| Comparisons | BarChart3 | `/(dashboard)/comparisons` |
| Stocks | TrendingUp | `/(dashboard)/stocks` |

Use `lucide-react` icons (installed by shadcn).

Active link highlighting based on current pathname (use `usePathname()`).

### `home-budget-web/components/layout/Header.tsx`

Top bar with:
- `SidebarTrigger` (hamburger to toggle sidebar on mobile)
- Breadcrumb showing current section name

### `home-budget-web/app/(dashboard)/layout.tsx`

Dashboard route group layout that renders `<Header />` + `{children}` in a flex column.

### Placeholder pages

Create minimal placeholder pages that render the section title in a `<Card>`:

- `app/(dashboard)/overview/page.tsx` -- "Overview - Coming Soon"
- `app/(dashboard)/accounts/page.tsx` -- "Accounts - Coming Soon"
- `app/(dashboard)/transactions/page.tsx` -- "Transactions - Coming Soon"
- `app/(dashboard)/budgets/page.tsx` -- "Budgets - Coming Soon"
- `app/(dashboard)/comparisons/page.tsx` -- "Comparisons - Coming Soon"
- `app/(dashboard)/stocks/page.tsx` -- "Stocks - Coming Soon"

### `home-budget-web/app/page.tsx`

Redirect to `/(dashboard)/overview` using `redirect()` from `next/navigation`.

**Acceptance:**
- App starts with `npm run dev`
- Sidebar shows 6 navigation items
- Clicking each item navigates to its placeholder page
- Sidebar collapses on mobile with hamburger trigger
- No TypeScript errors, no console errors

---

## Task 7: Utility Functions

### `home-budget-web/lib/utils/formatCurrency.ts`

```typescript
export function formatCurrency(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseCentsFromInput(value: string): number {
  const float = parseFloat(value.replace(",", "."));
  if (isNaN(float)) throw new Error(`Invalid currency value: "${value}"`);
  return Math.round(float * 100);
}
```

### `home-budget-web/lib/utils/formatDate.ts`

```typescript
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

**Acceptance:**
- `formatCurrency(123456)` returns `"€ 1.234,56"` (Belgian nl-BE format)
- `formatDate(new Date("2026-04-08"))` returns `"08 apr. 2026"` (Dutch Belgian format)
- `toISODate` uses local date parts, not UTC (no day-shift for positive UTC offsets)

---

## Summary of All Files Created

```
home-budget/
├── .gitignore
├── .env
├── docker-compose.yml
└── home-budget-web/
    ├── .env.local
    ├── drizzle.config.ts
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts
    │   │   ├── schema.ts
    │   │   ├── seed.ts
    │   │   └── migrations/          (generated by drizzle-kit)
    │   ├── utils/
    │   │   ├── formatCurrency.ts
    │   │   └── formatDate.ts
    │   └── constants/
    │       └── navigation.ts
    ├── .env.local.example
    ├── components/
    │   ├── providers/
    │   │   └── QueryProvider.tsx
    │   ├── layout/
    │   │   ├── AppSidebar.tsx
    │   │   └── Header.tsx
    │   └── ui/                      (populated by shadcn)
    └── app/
        ├── layout.tsx               (modified)
        ├── page.tsx                 (redirect to overview)
        ├── globals.css              (modified by shadcn init)
        └── (dashboard)/
            ├── layout.tsx
            ├── overview/page.tsx
            ├── accounts/page.tsx
            ├── transactions/page.tsx
            ├── budgets/page.tsx
            ├── comparisons/page.tsx
            └── stocks/page.tsx
```
