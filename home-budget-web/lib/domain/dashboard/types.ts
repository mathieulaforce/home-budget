export interface BudgetStatus {
  planned: number;
  actual: number;
  variance: number;
}

export interface DashboardSummary {
  netWorth: number;
  totalSpend: number;
  savingsRate: number;
  budgetStatus: BudgetStatus | null;
}

export interface SummaryWithChange {
  value: number;
  previousValue: number;
  changePercent: number;
  direction: "up" | "down" | "neutral";
}

export interface CategorySpending {
  categoryId: number | null;
  categoryName: string;
  groupName: string;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TransactionRow {
  id: number;
  date: string;
  description: string;
  amount: number;
  accountName: string;
  categoryName: string | null;
}

export interface BudgetCategoryStatus {
  categoryName: string;
  planned: number;
  actual: number;
}

export interface DashboardPayload {
  summary: DashboardSummary;
  previousSummary: DashboardSummary;
  spendingByCategory: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
  recentTransactions: TransactionRow[];
  budgetByCategory: BudgetCategoryStatus[];
}
