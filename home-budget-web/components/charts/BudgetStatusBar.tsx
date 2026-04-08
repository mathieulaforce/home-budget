"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { BudgetCategoryStatus } from "@/lib/domain/dashboard/types";

interface BudgetStatusBarProps {
  data: BudgetCategoryStatus[] | undefined;
  isLoading: boolean;
}

const chartConfig: ChartConfig = {
  planned: { label: "Planned", color: "hsl(210, 10%, 70%)" },
  actual: { label: "Actual", color: "hsl(221, 83%, 53%)" },
};

function formatYAxisCents(value: number): string {
  const euros = value / 100;
  if (Math.abs(euros) >= 1000) return `€${(euros / 1000).toFixed(0)}k`;
  return `€${euros.toFixed(0)}`;
}

export function BudgetStatusBar({ data, isLoading }: BudgetStatusBarProps) {
  if (isLoading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-center text-muted-foreground">
              No budget set for this period.
              <br />
              <span className="text-sm">
                Create a budget to compare planned vs actual spending.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tickFormatter={formatYAxisCents} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="categoryName"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Bar
              dataKey="planned"
              fill="var(--color-planned)"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
            <Bar
              dataKey="actual"
              fill="var(--color-actual)"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-3 flex items-center justify-center gap-6">
          {Object.entries(chartConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
