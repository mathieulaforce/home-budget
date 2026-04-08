import type { BenchmarkRating, BenchmarkRegion, HouseholdSize } from "./types";
import { regionalMultipliers, householdSizeMultipliers } from "@/lib/benchmarks/data";

export function applyMultipliers(
  baseCents: number,
  region: BenchmarkRegion,
  householdSize: HouseholdSize
): number {
  const regionMul = regionalMultipliers[region];
  const sizeMul = householdSizeMultipliers[householdSize];
  return Math.round(baseCents * regionMul * sizeMul);
}

export function computeRating(user: number, benchmark: number): BenchmarkRating {
  if (benchmark === 0) return "average";
  const ratio = user / benchmark;
  if (ratio < 0.8) return "below";
  if (ratio > 1.2) return "above";
  return "average";
}
