"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PortfolioHistoryPoint } from "@/lib/domain/stocks/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const chartConfig = {
  value: {
    label: "Portfolio Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatMonth(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-BE", { month: "short", year: "2-digit" });
}

export function PortfolioValueChart({ data }: { data: PortfolioHistoryPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        No price history available
      </div>
    );
  }

  const chartData = data.map((p) => ({
    date: p.date,
    value: p.valueCents / 100,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatMonth}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v * 100)}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value) * 100)}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fill="url(#portfolioGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
