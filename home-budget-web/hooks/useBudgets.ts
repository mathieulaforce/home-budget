import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BudgetListItem, BudgetVsActualResult } from "@/lib/domain/budgets/types";
import type { CreateBudgetInput, UpdateBudgetItemInput, DuplicateBudgetInput } from "@/lib/validators/budgets";
import { ApiError } from "@/lib/errors/api-error";

export const budgetKeys = {
  all: ["budgets"] as const,
  detail: (id: number) => ["budgets", id] as const,
  comparison: (id: number) => ["budgets", id, "comparison"] as const,
};

export function useBudgets() {
  return useQuery<BudgetListItem[]>({
    queryKey: budgetKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/budgets");
      if (!res.ok) throw new Error("Failed to fetch budgets");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useBudgetComparison(id: number) {
  return useQuery<BudgetVsActualResult>({
    queryKey: budgetKeys.comparison(id),
    queryFn: async () => {
      const res = await fetch(`/api/budgets/${id}?compare=true`);
      if (!res.ok) throw new Error("Failed to fetch budget comparison");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to create budget");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}

export function useUpdateBudgetItem(budgetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      input,
    }: {
      itemId: number;
      input: UpdateBudgetItemInput;
    }) => {
      const res = await fetch(`/api/budgets/${budgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ...input }),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to update budget item");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      queryClient.invalidateQueries({
        queryKey: budgetKeys.comparison(budgetId),
      });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to delete budget");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}

export function useDuplicateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: DuplicateBudgetInput;
    }) => {
      const res = await fetch(`/api/budgets/${id}?action=duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to duplicate budget");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}
