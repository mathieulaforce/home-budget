"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AllocationSlice } from "@/lib/domain/stocks/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(var(--muted-foreground))",
];

export function AllocationPieChart({ slices }: { slices: AllocationSlice[] }) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        No allocation data
      </div>
    );
  }

  const chartConfig = slices.reduce<ChartConfig>((acc, slice, i) => {
    acc[slice.label] = {
      label: slice.label,
      color: COLORS[i % COLORS.length],
    };
    return acc;
  }, {});

  const chartData = slices.map((s, i) => ({
    name: s.label,
    value: s.valueCents / 100,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value) * 100)}
              nameKey="name"
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}
