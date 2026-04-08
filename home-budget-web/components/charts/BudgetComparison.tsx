"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { BudgetComparison as BudgetComparisonType } from "@/lib/domain/budgets/types";

const chartConfig = {
  planned: { label: "Planned", color: "var(--muted-foreground)" },
  actual: { label: "Actual", color: "var(--primary)" },
} satisfies ChartConfig;

const COLOR_NEGATIVE = "oklch(0.577 0.245 27.325)";
const COLOR_POSITIVE = "oklch(0.627 0.194 149.214)";

type Props = {
  comparisons: BudgetComparisonType[];
};

type ChartRow = {
  name: string;
  planned: number;
  actual: number;
  plannedCents: number;
  actualCents: number;
  variance: number;
  isIncome: boolean;
  isBad: boolean;
};

function isVarianceBad(variance: number, isIncome: boolean): boolean {
  if (isIncome) return variance < 0;
  return variance > 0;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="font-medium">{row.name}</p>
      <p>
        <span className="text-muted-foreground">Planned:</span>{" "}
        {formatCurrency(row.plannedCents)}
      </p>
      <p>
        <span className="text-muted-foreground">Actual:</span>{" "}
        {formatCurrency(row.actualCents)}
      </p>
      <p className={row.isBad ? "text-red-500" : "text-emerald-500"}>
        Variance: {row.variance > 0 ? "+" : ""}
        {formatCurrency(row.variance)}
      </p>
    </div>
  );
}

export function BudgetComparisonChart({ comparisons }: Props) {
  const data: ChartRow[] = comparisons.map((c) => ({
    name: c.categoryName,
    planned: c.planned / 100,
    actual: c.actual / 100,
    plannedCents: c.planned,
    actualCents: c.actual,
    variance: c.variance,
    isIncome: c.isIncome,
    isBad: isVarianceBad(c.variance, c.isIncome),
  }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No budget items to compare.
      </p>
    );
  }

  const chartHeight = Math.max(300, data.length * 50);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: chartHeight }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `€${v}`}
          fontSize={12}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={120}
          fontSize={12}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="planned"
          fill="var(--color-planned)"
          opacity={0.3}
          radius={[0, 4, 4, 0]}
          barSize={16}
          name="Planned"
        />
        <Bar dataKey="actual" radius={[0, 4, 4, 0]} barSize={16} name="Actual">
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isBad ? COLOR_NEGATIVE : COLOR_POSITIVE}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
