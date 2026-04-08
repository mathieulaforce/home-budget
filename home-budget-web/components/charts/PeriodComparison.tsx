"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { PeriodComparisonRow } from "@/lib/domain/comparisons/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface PeriodComparisonChartProps {
  rows: PeriodComparisonRow[];
  currentLabel: string;
  previousLabel: string;
}

const chartConfig = {
  currentPeriod: {
    label: "Current",
    color: "var(--chart-1)",
  },
  previousPeriod: {
    label: "Previous",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PeriodComparisonChart({
  rows,
  currentLabel,
  previousLabel,
}: PeriodComparisonChartProps) {
  const config = {
    currentPeriod: { ...chartConfig.currentPeriod, label: currentLabel },
    previousPeriod: { ...chartConfig.previousPeriod, label: previousLabel },
  } satisfies ChartConfig;

  const data = rows.slice(0, 10).map((row) => ({
    name: row.categoryName,
    currentPeriod: row.currentPeriod / 100,
    previousPeriod: row.previousPeriod / 100,
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No expense data for this period.
      </p>
    );
  }

  return (
    <ChartContainer config={config} className="min-h-[350px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={120}
          tickLine={false}
          axisLine={false}
          className="text-xs"
        />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatCurrency(v * 100)}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value) * 100)}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="currentPeriod"
          fill="var(--color-currentPeriod)"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="previousPeriod"
          fill="var(--color-previousPeriod)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
