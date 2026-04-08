import type { HoldingSummary, PortfolioSummary, AllocationSlice } from "./types";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function calculateHoldingMetrics(
  shares: number,
  costBasis: number,
  latestPrice: number | null
): { currentValue: number | null; gainLoss: number | null; returnPercent: number | null } {
  if (latestPrice === null) {
    return { currentValue: null, gainLoss: null, returnPercent: null };
  }
  const currentValue = Math.round(shares * latestPrice);
  const gainLoss = currentValue - costBasis;
  const returnPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;
  return { currentValue, gainLoss, returnPercent };
}

export function calculateAllocation(holdings: HoldingSummary[]): AllocationSlice[] {
  const valued = holdings.filter((h) => h.currentValue !== null && h.currentValue > 0);
  const totalValue = valued.reduce((sum, h) => sum + h.currentValue!, 0);
  if (totalValue === 0) return [];

  const sorted = [...valued].sort((a, b) => b.currentValue! - a.currentValue!);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);

  const slices: AllocationSlice[] = top.map((h) => ({
    label: h.symbol,
    valueCents: h.currentValue!,
    percent: (h.currentValue! / totalValue) * 100,
  }));

  if (rest.length > 0) {
    const otherValue = rest.reduce((sum, h) => sum + h.currentValue!, 0);
    slices.push({
      label: "Other",
      valueCents: otherValue,
      percent: (otherValue / totalValue) * 100,
    });
  }

  return slices;
}

export function buildPortfolioSummary(holdings: HoldingSummary[]): PortfolioSummary {
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalReturnPercent = totalCostBasis !== 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  const withAllocation = holdings.map((h) => ({
    ...h,
    allocationPercent:
      h.currentValue !== null && totalValue > 0
        ? (h.currentValue / totalValue) * 100
        : null,
  }));

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalReturnPercent,
    holdings: withAllocation,
  };
}

export function isStalePrice(priceDate: string | Date | null): boolean {
  if (!priceDate) return true;
  const ts = priceDate instanceof Date ? priceDate.getTime() : new Date(priceDate).getTime();
  if (isNaN(ts)) return true;
  return Date.now() - ts > STALE_THRESHOLD_MS;
}
