import {
  mysqlTable,
  int,
  varchar,
  boolean,
  date,
  timestamp,
  decimal,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["checking", "savings", "investment", "credit_card"]).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  initialBalance: int("initial_balance").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
  stockHoldings: many(stockHoldings),
}));

export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  groupName: varchar("group_name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  isIncome: boolean("is_income").notNull().default(false),
  sortOrder: int("sort_order").notNull().default(0),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgetItems: many(budgetItems),
}));

// FK references use RESTRICT on delete by default — an account/category cannot
// be deleted while transactions reference it. This is intentional: force the user
// to reassign or remove dependent rows first.
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").primaryKey().autoincrement(),
    accountId: int("account_id")
      .notNull()
      .references(() => accounts.id),
    categoryId: int("category_id").references(() => categories.id),
    date: date("date", { mode: "date" }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    amount: int("amount").notNull(),
    notes: varchar("notes", { length: 500 }),
    importHash: varchar("import_hash", { length: 64 }).unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index("account_idx").on(table.accountId),
    categoryIdx: index("category_idx").on(table.categoryId),
    dateIdx: index("date_idx").on(table.date),
  })
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgets = mysqlTable("budgets", {
  id: int("id").primaryKey().autoincrement(),
  year: int("year").notNull(),
  month: int("month"),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const budgetsRelations = relations(budgets, ({ many }) => ({
  items: many(budgetItems),
}));

export const budgetItems = mysqlTable(
  "budget_items",
  {
    id: int("id").primaryKey().autoincrement(),
    budgetId: int("budget_id")
      .notNull()
      .references(() => budgets.id),
    categoryId: int("category_id")
      .notNull()
      .references(() => categories.id),
    plannedAmount: int("planned_amount").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    budgetIdx: index("budget_idx").on(table.budgetId),
    categoryIdx: index("bi_category_idx").on(table.categoryId),
  })
);

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetItems.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [budgetItems.categoryId],
    references: [categories.id],
  }),
}));

export const stockHoldings = mysqlTable(
  "stock_holdings",
  {
    id: int("id").primaryKey().autoincrement(),
    accountId: int("account_id")
      .notNull()
      .references(() => accounts.id),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    shares: decimal("shares", { precision: 16, scale: 6 }).notNull(),
    costBasis: int("cost_basis").notNull(),
    purchaseDate: date("purchase_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index("sh_account_idx").on(table.accountId),
  })
);

export const stockHoldingsRelations = relations(stockHoldings, ({ one }) => ({
  account: one(accounts, {
    fields: [stockHoldings.accountId],
    references: [accounts.id],
  }),
}));

export const stockPrices = mysqlTable(
  "stock_prices",
  {
    id: int("id").primaryKey().autoincrement(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    date: date("date", { mode: "date" }).notNull(),
    price: int("price").notNull(),
  },
  (table) => ({
    symbolDateIdx: uniqueIndex("symbol_date_idx").on(table.symbol, table.date),
  })
);
