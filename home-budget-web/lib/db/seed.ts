import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories } from "./schema";

const seedCategories = [
  { name: "Rent/Mortgage", groupName: "Housing", isIncome: false, sortOrder: 1 },
  { name: "Utilities", groupName: "Housing", isIncome: false, sortOrder: 2 },
  { name: "Insurance", groupName: "Housing", isIncome: false, sortOrder: 3 },
  { name: "Maintenance", groupName: "Housing", isIncome: false, sortOrder: 4 },
  { name: "Groceries", groupName: "Food", isIncome: false, sortOrder: 10 },
  { name: "Restaurants", groupName: "Food", isIncome: false, sortOrder: 11 },
  { name: "Coffee/Snacks", groupName: "Food", isIncome: false, sortOrder: 12 },
  { name: "Fuel", groupName: "Transport", isIncome: false, sortOrder: 20 },
  { name: "Public Transit", groupName: "Transport", isIncome: false, sortOrder: 21 },
  { name: "Car Insurance", groupName: "Transport", isIncome: false, sortOrder: 22 },
  { name: "Parking", groupName: "Transport", isIncome: false, sortOrder: 23 },
  { name: "Doctor", groupName: "Health", isIncome: false, sortOrder: 30 },
  { name: "Pharmacy", groupName: "Health", isIncome: false, sortOrder: 31 },
  { name: "Gym", groupName: "Health", isIncome: false, sortOrder: 32 },
  { name: "Subscriptions", groupName: "Entertainment", isIncome: false, sortOrder: 40 },
  { name: "Hobbies", groupName: "Entertainment", isIncome: false, sortOrder: 41 },
  { name: "Going Out", groupName: "Entertainment", isIncome: false, sortOrder: 42 },
  { name: "Clothing", groupName: "Shopping", isIncome: false, sortOrder: 50 },
  { name: "Electronics", groupName: "Shopping", isIncome: false, sortOrder: 51 },
  { name: "Home & Garden", groupName: "Shopping", isIncome: false, sortOrder: 52 },
  { name: "Savings Transfer", groupName: "Financial", isIncome: false, sortOrder: 60 },
  { name: "Investment", groupName: "Financial", isIncome: false, sortOrder: 61 },
  { name: "Bank Fees", groupName: "Financial", isIncome: false, sortOrder: 62 },
  { name: "Taxes", groupName: "Financial", isIncome: false, sortOrder: 63 },
  { name: "Salary", groupName: "Income", isIncome: true, sortOrder: 70 },
  { name: "Freelance", groupName: "Income", isIncome: true, sortOrder: 71 },
  { name: "Dividends", groupName: "Income", isIncome: true, sortOrder: 72 },
  { name: "Gifts Received", groupName: "Income", isIncome: true, sortOrder: 73 },
  { name: "Uncategorized", groupName: "Other", isIncome: false, sortOrder: 90 },
  { name: "Miscellaneous", groupName: "Other", isIncome: false, sortOrder: 91 },
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
