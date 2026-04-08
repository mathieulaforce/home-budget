export type BudgetListItem = {
  id: number;
  year: number;
  month: number | null;
  name: string;
  totalPlanned: number;
  createdAt: Date;
};

export type BudgetItemDetail = {
  id: number;
  categoryId: number;
  categoryName: string;
  groupName: string;
  isIncome: boolean;
  plannedAmount: number;
  sortOrder: number;
};

export type BudgetDetail = {
  id: number;
  year: number;
  month: number | null;
  name: string;
  items: BudgetItemDetail[];
};

export type BudgetComparison = {
  categoryId: number;
  categoryName: string;
  groupName: string;
  isIncome: boolean;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number | null;
};

export type BudgetVsActualResult = {
  budget: BudgetDetail;
  comparisons: BudgetComparison[];
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
};
