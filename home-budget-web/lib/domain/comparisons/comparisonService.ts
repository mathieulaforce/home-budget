import type { PeriodComparisonRow } from "./types";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface YearMonth {
  year: number;
  month: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  categoryName: string;
  groupName: string;
  total: number;
}

export function getMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

export function previousMonth(year: number, month: number): YearMonth {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function sameMonthLastYear(year: number, month: number): YearMonth {
  return { year: year - 1, month };
}

export function computeChange(
  current: number,
  previous: number
): { change: number; changePercent: number | null } {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : null;
  return { change, changePercent };
}

export function mergeCategoryTotals(
  currentMap: Map<string, CategoryTotal>,
  previousMap: Map<string, CategoryTotal>,
  allKeys: Set<string>
): PeriodComparisonRow[] {
  const rows: PeriodComparisonRow[] = [];

  for (const key of allKeys) {
    const cur = currentMap.get(key);
    const prev = previousMap.get(key);

    const currentPeriod = cur?.total ?? 0;
    const previousPeriod = prev?.total ?? 0;
    const { change, changePercent } = computeChange(currentPeriod, previousPeriod);

    rows.push({
      categoryId: cur?.categoryId ?? prev?.categoryId ?? null,
      categoryName: cur?.categoryName ?? prev?.categoryName ?? key,
      groupName: cur?.groupName ?? prev?.groupName ?? "",
      currentPeriod,
      previousPeriod,
      change,
      changePercent,
    });
  }

  return rows.sort((a, b) => Math.abs(b.currentPeriod) - Math.abs(a.currentPeriod));
}

export function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("nl-BE", { month: "long", year: "numeric" });
}
