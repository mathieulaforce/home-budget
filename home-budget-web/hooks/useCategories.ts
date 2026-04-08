import { useQuery } from "@tanstack/react-query";
import type { CategorySummary } from "@/lib/domain/transactions/types";

export const categoryKeys = {
  all: ["categories"] as const,
};

export function useCategories() {
  return useQuery<CategorySummary[]>({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data;
    },
  });
}
