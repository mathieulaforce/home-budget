"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { MonthlyTrend as MonthlyTrendType } from "@/lib/domain/dashboard/types";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

interface MonthlyTrendProps {
  data: MonthlyTrendType[] | undefined;
  isLoading: boolean;
}

const chartConfig: ChartConfig = {
  income: { label: "Income", color: "hsl(142, 71%, 45%)" },
  expenses: { label: "Expenses", color: "hsl(0, 84%, 60%)" },
  net: { label: "Net", color: "hsl(221, 83%, 53%)" },
};

function formatMonth(value: string): string {
  const parts = value.split("-");
  const monthIdx = parseInt(parts[1], 10) - 1;
  return MONTH_SHORT[monthIdx] ?? value;
}

function formatYAxisCents(value: number): string {
  const euros = value / 100;
  if (Math.abs(euros) >= 1000) return `${(euros / 1000).toFixed(0)}k`;
  return euros.toFixed(0);
}

export function MonthlyTrend({ data, isLoading }: MonthlyTrendProps) {
  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-muted-foreground">
            No transaction data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={formatYAxisCents} tick={{ fontSize: 12 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => {
                    const parts = String(label).split("-");
                    const monthIdx = parseInt(parts[1], 10) - 1;
                    return `${MONTH_SHORT[monthIdx]} ${parts[0]}`;
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="var(--color-income)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--color-net)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
          </LineChart>
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
