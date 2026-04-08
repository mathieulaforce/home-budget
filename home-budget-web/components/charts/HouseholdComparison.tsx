"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { BenchmarkComparisonRow, BenchmarkRating } from "@/lib/domain/comparisons/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface HouseholdComparisonChartProps {
  rows: BenchmarkComparisonRow[];
}

const ratingColors: Record<BenchmarkRating, string> = {
  below: "var(--color-emerald)",
  average: "var(--color-amber)",
  above: "var(--color-red)",
};

const chartConfig = {
  userMonthly: {
    label: "You",
    color: "var(--chart-1)",
  },
  benchmarkMonthly: {
    label: "Average",
    color: "var(--chart-4)",
  },
  emerald: { color: "oklch(0.765 0.177 163.22)" },
  amber: { color: "oklch(0.769 0.188 70.08)" },
  red: { color: "oklch(0.637 0.237 25.33)" },
} satisfies ChartConfig;

export function HouseholdComparisonChart({ rows }: HouseholdComparisonChartProps) {
  const data = rows.map((row) => ({
    name: row.categoryGroup,
    userMonthly: row.userMonthly / 100,
    benchmarkMonthly: row.benchmarkMonthly / 100,
    rating: row.rating,
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No benchmark data available.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
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
        <Bar dataKey="userMonthly" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={ratingColors[entry.rating]} />
          ))}
        </Bar>
        <Bar
          dataKey="benchmarkMonthly"
          fill="var(--color-benchmarkMonthly)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
