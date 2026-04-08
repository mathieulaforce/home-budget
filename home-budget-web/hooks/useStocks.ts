import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioSummary, PortfolioHistoryPoint } from "@/lib/domain/stocks/types";
import type { AddHoldingInput, UpdateHoldingInput } from "@/lib/validators/stocks";
import { ApiError } from "@/lib/errors/api-error";

export const stockKeys = {
  all: ["stocks"] as const,
  portfolio: ["stocks", "portfolio"] as const,
  history: (months: number) => ["stocks", "history", months] as const,
};

export function usePortfolio() {
  return useQuery<PortfolioSummary>({
    queryKey: stockKeys.portfolio,
    queryFn: async () => {
      const res = await fetch("/api/stocks");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const json = await res.json();
      return json.data;
    },
  });
}

export function usePortfolioHistory(months: number) {
  return useQuery<PortfolioHistoryPoint[]>({
    queryKey: stockKeys.history(months),
    queryFn: async () => {
      const res = await fetch(`/api/stocks/prices?months=${months}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio history");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddHoldingInput) => {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to add holding");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export function useUpdateHolding(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateHoldingInput) => {
      const res = await fetch(`/api/stocks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to update holding");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stocks/prices", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh prices");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}
