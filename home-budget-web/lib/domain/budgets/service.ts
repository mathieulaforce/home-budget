export function getPeriodDateRange(
  year: number,
  month: number | null
): { start: Date; end: Date } {
  if (month != null) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function computeVariance(planned: number, actual: number): number {
  return actual - planned;
}

export function computeVariancePercent(
  planned: number,
  actual: number
): number | null {
  if (planned === 0) return null;
  return ((actual - planned) / Math.abs(planned)) * 100;
}
