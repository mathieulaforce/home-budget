/**
 * Maps the app's category group_name values (from DB) to the benchmark
 * category groups used in the static benchmark data. Only expense groups
 * that have a meaningful benchmark counterpart are included.
 */
export const categoryGroupToBenchmark: Record<string, string> = {
  Housing: "Housing",
  Food: "Food",
  Transport: "Transport",
  Health: "Health",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
  Financial: "Financial",
};

export function mapToBenchmarkGroup(groupName: string): string | null {
  return categoryGroupToBenchmark[groupName] ?? null;
}
