"use client";

import { Suspense } from "react";
import { PeriodSelector, usePeriodFromParams } from "@/components/dashboard/PeriodSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { MonthlyTrend } from "@/components/charts/MonthlyTrend";
import { SpendingDonut } from "@/components/charts/SpendingDonut";
import { BudgetStatusBar } from "@/components/charts/BudgetStatusBar";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useDashboard } from "@/hooks/useDashboard";

function DashboardContent() {
  const selection = usePeriodFromParams();
  const { data, isLoading } = useDashboard(selection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <PeriodSelector selection={selection} />
      </div>

      <SummaryCards
        summary={data?.summary}
        previousSummary={data?.previousSummary}
        isLoading={isLoading}
      />

      <MonthlyTrend data={data?.monthlyTrend} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpendingDonut data={data?.spendingByCategory} isLoading={isLoading} />
        <BudgetStatusBar data={data?.budgetByCategory} isLoading={isLoading} />
      </div>

      <RecentTransactions
        data={data?.recentTransactions}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
