"use client";

import Link from "next/link";
import { Plus, RefreshCw, TrendingUp, Wallet, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HoldingsTable } from "@/components/stocks/HoldingsTable";
import { PortfolioValueChart } from "@/components/charts/PortfolioValue";
import { AllocationPieChart } from "@/components/charts/AllocationPie";
import { usePortfolio, usePortfolioHistory, useRefreshPrices } from "@/hooks/useStocks";
import { calculateAllocation } from "@/lib/domain/stocks/service";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function SummaryCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${colorClass ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function StocksPage() {
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: history } = usePortfolioHistory(12);
  const refreshMutation = useRefreshPrices();

  const handleRefresh = async () => {
    try {
      const result = await refreshMutation.mutateAsync();
      const { refreshed, failed } = result.data;
      if (failed.length > 0) {
        toast.warning(`Refreshed ${refreshed} prices. Failed: ${failed.join(", ")}`);
      } else {
        toast.success(`Refreshed ${refreshed} price${refreshed !== 1 ? "s" : ""}`);
      }
    } catch {
      toast.error("Failed to refresh prices");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const isEmpty = !portfolio || portfolio.holdings.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Stock Portfolio</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="mb-4 size-12 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No holdings yet. Add your first stock or ETF to get started.
            </p>
            <Link href="/stocks/add">
              <Button>
                <Plus data-icon="inline-start" />
                Add Holding
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allocationSlices = calculateAllocation(portfolio.holdings);
  const gainLossColor =
    portfolio.totalGainLoss >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const returnStr = `${portfolio.totalGainLoss >= 0 ? "+" : ""}${formatCurrency(portfolio.totalGainLoss)} (${portfolio.totalReturnPercent >= 0 ? "+" : ""}${portfolio.totalReturnPercent.toFixed(1)}%)`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Stock Portfolio</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw
              className={`size-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
              data-icon="inline-start"
            />
            {refreshMutation.isPending ? "Refreshing…" : "Refresh Prices"}
          </Button>
          <Link href="/stocks/add">
            <Button>
              <Plus data-icon="inline-start" />
              Add Holding
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Portfolio Value"
          value={formatCurrency(portfolio.totalValue)}
          icon={Wallet}
        />
        <SummaryCard
          title="Total Cost"
          value={formatCurrency(portfolio.totalCostBasis)}
          icon={ArrowUpDown}
        />
        <SummaryCard
          title="Total Return"
          value={returnStr}
          icon={TrendingUp}
          colorClass={gainLossColor}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Value (12m)</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioValueChart data={history ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationPieChart slices={allocationSlices} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={portfolio.holdings} />
        </CardContent>
      </Card>
    </div>
  );
}
