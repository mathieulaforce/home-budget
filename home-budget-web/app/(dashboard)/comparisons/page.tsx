"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodComparisonChart } from "@/components/charts/PeriodComparison";
import { HouseholdComparisonChart } from "@/components/charts/HouseholdComparison";
import { HouseholdSettings } from "@/components/comparisons/HouseholdSettings";
import { usePeriodComparison, useHouseholdBenchmarks } from "@/hooks/useComparisons";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatMonthLabel } from "@/lib/domain/comparisons/comparisonService";
import type { ComparisonType, BenchmarkRegion, HouseholdSize } from "@/lib/domain/comparisons/types";
import { BENCHMARK_SOURCE } from "@/lib/benchmarks/data";

function now() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function PeriodNav({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const goBack = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const goForward = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  const current = now();
  const isCurrentMonth = year === current.year && month === current.month;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={goBack}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium capitalize">
        {formatMonthLabel(year, month)}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={goForward}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function ChangeIndicator({ change, percent }: { change: number; percent: number | null }) {
  if (change === 0) return <Minus className="inline size-3.5 text-muted-foreground" />;
  const isUp = change > 0;
  const color = isUp ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="size-3.5" />
      {percent !== null && (
        <span className="text-xs tabular-nums">
          {percent > 0 ? "+" : ""}
          {percent.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

function PeriodTab({ type }: { type: ComparisonType }) {
  const current = now();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);

  const { data, isLoading } = usePeriodComparison(type, year, month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PeriodNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card size="sm">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{data.currentLabel}</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(data.currentTotal)}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{data.previousLabel}</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(data.previousTotal)}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Change</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold tabular-nums">
                    {data.totalChange >= 0 ? "+" : ""}
                    {formatCurrency(data.totalChange)}
                  </p>
                  <ChangeIndicator
                    change={data.totalChange}
                    percent={data.totalChangePercent}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                {data.currentLabel} vs {data.previousLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeriodComparisonChart
                rows={data.rows}
                currentLabel={data.currentLabel}
                previousLabel={data.previousLabel}
              />
            </CardContent>
          </Card>

          {data.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">{data.currentLabel}</TableHead>
                      <TableHead className="text-right">{data.previousLabel}</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.categoryName}>
                        <TableCell className="font-medium">
                          {row.categoryName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.groupName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.currentPeriod)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.previousPeriod)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ChangeIndicator
                            change={row.change}
                            percent={row.changePercent}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(data.currentTotal)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(data.previousTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChangeIndicator
                          change={data.totalChange}
                          percent={data.totalChangePercent}
                        />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground">
          No data available for this period.
        </p>
      )}
    </div>
  );
}

function HouseholdTab() {
  const current = now();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [region, setRegion] = useState<BenchmarkRegion>("belgium");
  const [householdSize, setHouseholdSize] = useState<HouseholdSize>("couple_1child");
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useHouseholdBenchmarks(
    region,
    householdSize,
    months,
    year,
    month
  );

  const ratingLabel = (rating: string) => {
    switch (rating) {
      case "below":
        return <span className="text-emerald-600 dark:text-emerald-400">Below avg</span>;
      case "above":
        return <span className="text-red-600 dark:text-red-400">Above avg</span>;
      default:
        return <span className="text-amber-600 dark:text-amber-400">Average</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PeriodNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      <HouseholdSettings
        region={region}
        householdSize={householdSize}
        months={months}
        onRegionChange={setRegion}
        onHouseholdSizeChange={setHouseholdSize}
        onMonthsChange={setMonths}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Your Spending vs Average Household</CardTitle>
              <CardDescription>
                Based on your last {months} months ending {formatMonthLabel(year, month)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HouseholdComparisonChart rows={data.rows} />
            </CardContent>
          </Card>

          {data.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">You (monthly)</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.categoryGroup}>
                        <TableCell className="font-medium">
                          {row.categoryGroup}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.userMonthly)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.benchmarkMonthly)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.difference >= 0 ? "+" : ""}
                          {formatCurrency(row.difference)}
                          {row.differencePercent !== null && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({row.differencePercent > 0 ? "+" : ""}
                              {row.differencePercent.toFixed(0)}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {ratingLabel(row.rating)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Based on {BENCHMARK_SOURCE} data for {data.referenceYear}.
            Actual averages vary by income, location, and household composition.
          </p>
        </>
      ) : (
        <p className="text-center text-muted-foreground">
          No benchmark data available.
        </p>
      )}
    </div>
  );
}

export default function ComparisonsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Comparisons</h1>

      <Tabs defaultValue="mom">
        <TabsList>
          <TabsTrigger value="mom">Month over Month</TabsTrigger>
          <TabsTrigger value="yoy">Year over Year</TabsTrigger>
          <TabsTrigger value="household">Household Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="mom">
          <PeriodTab type="mom" />
        </TabsContent>

        <TabsContent value="yoy">
          <PeriodTab type="yoy" />
        </TabsContent>

        <TabsContent value="household">
          <HouseholdTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
