import { useQuery } from "@tanstack/react-query";
import type { ComparisonType, ComparisonResult, BenchmarkResult, BenchmarkRegion, HouseholdSize } from "@/lib/domain/comparisons/types";

export const comparisonKeys = {
  period: (type: ComparisonType, year: number, month: number) =>
    ["comparisons", type, year, month] as const,
  benchmark: (
    region: BenchmarkRegion,
    size: HouseholdSize,
    months: number,
    year: number,
    month: number
  ) => ["benchmarks", region, size, months, year, month] as const,
};

export function usePeriodComparison(
  type: ComparisonType,
  year: number,
  month: number
) {
  return useQuery<ComparisonResult>({
    queryKey: comparisonKeys.period(type, year, month),
    queryFn: async () => {
      const params = new URLSearchParams({
        type,
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/comparisons?${params}`);
      if (!res.ok) throw new Error("Failed to fetch comparison");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useHouseholdBenchmarks(
  region: BenchmarkRegion,
  size: HouseholdSize,
  months: number,
  year: number,
  month: number
) {
  return useQuery<BenchmarkResult>({
    queryKey: comparisonKeys.benchmark(region, size, months, year, month),
    queryFn: async () => {
      const params = new URLSearchParams({
        region,
        householdSize: size,
        months: String(months),
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/benchmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch benchmarks");
      const json = await res.json();
      return json.data;
    },
  });
}
