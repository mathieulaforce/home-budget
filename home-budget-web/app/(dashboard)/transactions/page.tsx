"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionFilters as TxFilters } from "@/lib/validators/transactions";

const VALID_SORT_BY = ["date", "amount", "description"] as const;
const VALID_SORT_ORDER = ["asc", "desc"] as const;

function TransactionsContent() {
  const searchParams = useSearchParams();

  const rawSortBy = searchParams.get("sortBy");
  const rawSortOrder = searchParams.get("sortOrder");

  const filters: Partial<TxFilters> = {
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "25"),
    sortBy: VALID_SORT_BY.includes(rawSortBy as TxFilters["sortBy"])
      ? (rawSortBy as TxFilters["sortBy"])
      : "date",
    sortOrder: VALID_SORT_ORDER.includes(rawSortOrder as TxFilters["sortOrder"])
      ? (rawSortOrder as TxFilters["sortOrder"])
      : "desc",
  };

  const accountId = searchParams.get("accountId");
  if (accountId) filters.accountId = Number(accountId);

  const categoryId = searchParams.get("categoryId");
  if (categoryId) filters.categoryId = Number(categoryId);

  const startDate = searchParams.get("startDate");
  if (startDate) filters.startDate = new Date(startDate);

  const endDate = searchParams.get("endDate");
  if (endDate) filters.endDate = new Date(endDate);

  const search = searchParams.get("search");
  if (search) filters.search = search;

  const { data, isLoading } = useTransactions(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <Link href="/transactions/new" className={buttonVariants()}>
          <Plus className="mr-1 size-4" />
          New Transaction
        </Link>
      </div>

      <TransactionFilters />

      <TooltipProvider>
        <TransactionTable data={data} isLoading={isLoading} />
      </TooltipProvider>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
