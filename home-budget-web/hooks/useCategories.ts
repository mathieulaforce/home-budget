import { useQuery } from "@tanstack/react-query";
import type { InferSelectModel } from "drizzle-orm";
import type { categories } from "@/lib/db/schema";

export type Category = InferSelectModel<typeof categories>;

export const categoryKeys = {
  all: ["categories"] as const,
};

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data;
    },
  });
}
