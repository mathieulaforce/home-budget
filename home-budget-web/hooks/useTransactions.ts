import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TransactionRow,
  PaginatedResult,
} from "@/lib/domain/transactions/types";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from "@/lib/validators/transactions";
import { ApiError } from "@/lib/errors/api-error";

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: Partial<TransactionFilters>) =>
    ["transactions", "list", filters] as const,
  detail: (id: number) => ["transactions", "detail", id] as const,
};

function buildQueryString(filters: Partial<TransactionFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      if (value instanceof Date) {
        params.set(key, value.toISOString());
      } else {
        params.set(key, String(value));
      }
    }
  }
  return params.toString();
}

export function useTransactions(filters: Partial<TransactionFilters>) {
  return useQuery<PaginatedResult<TransactionRow>>({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const qs = buildQueryString(filters);
      const res = await fetch(`/api/transactions?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useTransaction(id: number) {
  return useQuery<TransactionRow>({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch transaction");
      const json = await res.json();
      return json.data;
    },
    enabled: id > 0,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to create transaction");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}

export function useUpdateTransaction(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to update transaction");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(id),
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let json: { error?: unknown };
        try {
          json = await res.json();
        } catch {
          throw new ApiError("Failed to delete transaction");
        }
        throw ApiError.fromResponse(json.error);
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
