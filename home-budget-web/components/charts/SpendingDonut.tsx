"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { CategorySpending } from "@/lib/domain/dashboard/types";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 67%, 55%)",
  "hsl(190, 80%, 45%)",
  "hsl(210, 10%, 60%)",
];

interface SpendingDonutProps {
  data: CategorySpending[] | undefined;
  isLoading: boolean;
}

export function SpendingDonut({ data, isLoading }: SpendingDonutProps) {
  if (isLoading || !data) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Skeleton className="size-64 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-muted-foreground">
            No spending data for this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.total, 0);

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.categoryName,
      { label: d.categoryName, color: COLORS[i % COLORS.length] },
    ])
  );

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatCurrency(Number(value))
                  }
                />
              }
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-lg font-bold"
            >
              {formatCurrency(total)}
            </text>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((d, i) => (
            <div key={d.categoryName} className="flex items-center gap-2 text-sm">
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">
                {d.categoryName}
              </span>
              <span className="ml-auto font-medium">{d.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
