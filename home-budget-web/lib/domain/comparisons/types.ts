export type ComparisonType = "mom" | "yoy";

export type BenchmarkRegion = "belgium" | "flanders" | "wallonia" | "brussels";

export type HouseholdSize =
  | "single"
  | "couple"
  | "couple_1child"
  | "couple_2children"
  | "couple_3plus"
  | "single_parent";

export type BenchmarkRating = "below" | "average" | "above";

export interface PeriodComparisonRow {
  categoryId: number | null;
  categoryName: string;
  groupName: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  changePercent: number | null;
}

export interface ComparisonResult {
  rows: PeriodComparisonRow[];
  currentTotal: number;
  previousTotal: number;
  totalChange: number;
  totalChangePercent: number | null;
  currentLabel: string;
  previousLabel: string;
}

export interface BenchmarkComparisonRow {
  categoryGroup: string;
  userMonthly: number;
  benchmarkMonthly: number;
  difference: number;
  differencePercent: number | null;
  rating: BenchmarkRating;
}

export interface BenchmarkResult {
  rows: BenchmarkComparisonRow[];
  region: BenchmarkRegion;
  householdSize: HouseholdSize;
  months: number;
  referenceYear: number;
}
