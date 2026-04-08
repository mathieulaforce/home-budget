import type { BenchmarkRegion, HouseholdSize } from "@/lib/domain/comparisons/types";

export interface BenchmarkEntry {
  categoryGroup: string;
  averageMonthly: number;
}

export const belgiumBenchmarks: BenchmarkEntry[] = [
  { categoryGroup: "Housing", averageMonthly: 85000 },
  { categoryGroup: "Food", averageMonthly: 45000 },
  { categoryGroup: "Transport", averageMonthly: 35000 },
  { categoryGroup: "Health", averageMonthly: 12000 },
  { categoryGroup: "Entertainment", averageMonthly: 20000 },
  { categoryGroup: "Shopping", averageMonthly: 25000 },
  { categoryGroup: "Financial", averageMonthly: 18000 },
];

export const regionalMultipliers: Record<BenchmarkRegion, number> = {
  belgium: 1.0,
  flanders: 1.02,
  wallonia: 0.92,
  brussels: 1.1,
};

export const householdSizeMultipliers: Record<HouseholdSize, number> = {
  single: 0.6,
  couple: 0.85,
  couple_1child: 1.0,
  couple_2children: 1.15,
  couple_3plus: 1.3,
  single_parent: 0.75,
};

export const BENCHMARK_REFERENCE_YEAR = 2024;
export const BENCHMARK_SOURCE = "Statbel Household Budget Survey";
