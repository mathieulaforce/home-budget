export interface TransactionRow {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryGroup: string | null;
  date: Date;
  description: string;
  amount: number;
  notes: string | null;
  importHash: string | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TransactionSortField = "date" | "amount" | "description";

export interface CategorySummary {
  id: number;
  name: string;
  groupName: string;
  icon: string | null;
  isIncome: boolean;
  sortOrder: number;
}
