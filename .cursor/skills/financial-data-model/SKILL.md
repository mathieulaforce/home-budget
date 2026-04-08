---
name: financial-data-model
description: Domain model for accounts, transactions, categories, budgets, and stock holdings using Drizzle ORM with MariaDB. Use when creating or modifying database tables, writing queries, or reasoning about entity relationships.
---

# Financial Data Model

## Entity Relationship Overview

```
Account 1──* Transaction *──1 Category
Account 1──* StockHolding 1──* StockPrice
Category 1──* BudgetItem *──1 Budget
```

- An **Account** has many Transactions and StockHoldings
- A **Transaction** belongs to one Account and one Category
- A **Budget** (a monthly/yearly plan) has many BudgetItems, each tied to a Category
- A **StockHolding** belongs to an Account and has historical StockPrices

## Core Entities

### Account

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| name | varchar(100) | e.g. "ING Checking", "Bolero Stocks" |
| type | enum | `checking`, `savings`, `investment`, `credit_card` |
| currency | varchar(3) | ISO 4217: `EUR`, `USD` |
| initial_balance | int | Balance in cents at time of first import |
| is_active | boolean | Soft-disable without deleting |
| created_at | timestamp | UTC |
| updated_at | timestamp | UTC |

### Transaction

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| account_id | int (FK → Account) | |
| category_id | int (FK → Category, nullable) | null = uncategorized |
| date | date | Transaction date |
| description | varchar(500) | Raw description from bank |
| amount | int | Cents. Positive = income, negative = expense |
| notes | varchar(500, nullable) | User-added notes |
| import_hash | varchar(64, unique) | SHA-256 of date+amount+description for dedup |
| created_at | timestamp | UTC |

### Category

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| name | varchar(100) | e.g. "Groceries", "Rent" |
| group_name | varchar(50) | Grouping: "Housing", "Food", "Transport", etc. |
| icon | varchar(50, nullable) | Icon identifier for UI |
| is_income | boolean | true for income categories (Salary, Freelance) |
| sort_order | int | For consistent display ordering |

### Budget

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| year | int | e.g. 2026 |
| month | int (nullable) | 1-12; null = yearly budget |
| name | varchar(100) | e.g. "April 2026", "Year 2026" |
| created_at | timestamp | UTC |

### BudgetItem

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| budget_id | int (FK → Budget) | |
| category_id | int (FK → Category) | |
| planned_amount | int | Cents (positive value, sign derived from category.is_income) |

### StockHolding

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| account_id | int (FK → Account) | |
| symbol | varchar(20) | Ticker: "AAPL", "VWCE.DE" |
| name | varchar(200) | "Apple Inc.", "Vanguard FTSE All-World" |
| shares | decimal(16,6) | Fractional shares supported |
| cost_basis | int | Total purchase cost in cents |
| purchase_date | date | |
| created_at | timestamp | UTC |

### StockPrice

| Column | Type | Notes |
|--------|------|-------|
| id | int (auto_increment, PK) | |
| symbol | varchar(20) | |
| date | date | |
| price | int | Price in cents |
| (unique) | | Composite unique on (symbol, date) |

## Key Rules

1. **Money is always cents** (integer). Never store as float/decimal for monetary amounts.
2. **Positive = income, Negative = expense** on Transaction.amount.
3. **Transfers between accounts**: create two linked transactions (one positive, one negative). Use a "Transfer" category.
4. **import_hash** prevents duplicate imports: `SHA-256(date + "|" + amount + "|" + description)`.
5. **Soft deletes**: prefer `is_active` flags over hard deletes for accounts.

## Category Taxonomy (Default Seed)

| Group | Categories |
|-------|-----------|
| Housing | Rent/Mortgage, Utilities, Insurance, Maintenance |
| Food | Groceries, Restaurants, Coffee/Snacks |
| Transport | Fuel, Public Transit, Car Insurance, Parking |
| Health | Doctor, Pharmacy, Gym |
| Entertainment | Subscriptions, Hobbies, Going Out |
| Shopping | Clothing, Electronics, Home & Garden |
| Financial | Savings Transfer, Investment, Bank Fees, Taxes |
| Income | Salary, Freelance, Dividends, Gifts Received |
| Other | Uncategorized, Miscellaneous |

For the full Drizzle schema definitions, see [schema-reference.md](schema-reference.md).
