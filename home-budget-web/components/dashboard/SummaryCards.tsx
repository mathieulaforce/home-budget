"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { DashboardSummary } from "@/lib/domain/dashboard/types";

interface SummaryCardsProps {
  summary: DashboardSummary | undefined;
  previousSummary: DashboardSummary | undefined;
  isLoading: boolean;
}

function computeChange(
  current: number,
  previous: number
): { percent: number; direction: "up" | "down" | "neutral" } {
  if (previous === 0) return { percent: 0, direction: "neutral" };
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent > 0) return { percent, direction: "up" };
  if (percent < 0) return { percent: Math.abs(percent), direction: "down" };
  return { percent: 0, direction: "neutral" };
}

function ChangeIndicator({
  direction,
  percent,
  goodDirection,
}: {
  direction: "up" | "down" | "neutral";
  percent: number;
  goodDirection: "up" | "down";
}) {
  if (direction === "neutral") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />
        0%
      </span>
    );
  }

  const isGood = direction === goodDirection;
  const color = isGood ? "text-emerald-600" : "text-red-600";
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      {percent}%
    </span>
  );
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  summary,
  previousSummary,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading || !summary || !previousSummary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const netWorthChange = computeChange(summary.netWorth, previousSummary.netWorth);
  const spendChange = computeChange(summary.totalSpend, previousSummary.totalSpend);
  const savingsChange = computeChange(summary.savingsRate, previousSummary.savingsRate);

  const budgetLabel = summary.budgetStatus
    ? formatCurrency(summary.budgetStatus.variance)
    : "No budget";
  const budgetSubtitle = summary.budgetStatus
    ? `${formatCurrency(summary.budgetStatus.actual)} of ${formatCurrency(summary.budgetStatus.planned)}`
    : "Set up a budget to track spending";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(summary.netWorth)}</p>
          <ChangeIndicator
            direction={netWorthChange.direction}
            percent={netWorthChange.percent}
            goodDirection="up"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalSpend)}</p>
          <ChangeIndicator
            direction={spendChange.direction}
            percent={spendChange.percent}
            goodDirection="down"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Savings Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{summary.savingsRate}%</p>
          <ChangeIndicator
            direction={savingsChange.direction}
            percent={savingsChange.percent}
            goodDirection="up"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{budgetLabel}</p>
          <p className="text-xs text-muted-foreground">{budgetSubtitle}</p>
        </CardContent>
      </Card>
    </div>
  );
}
