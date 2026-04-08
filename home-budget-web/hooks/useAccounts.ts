import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferSelectModel } from "drizzle-orm";
import type { accounts } from "@/lib/db/schema";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/lib/validators/accounts";

export type AccountWithBalance = InferSelectModel<typeof accounts> & {
  balance: number;
};

export const accountKeys = {
  all: ["accounts"] as const,
  detail: (id: number) => ["accounts", id] as const,
};

export function useAccounts() {
  return useQuery<AccountWithBalance[]>({
    queryKey: accountKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useAccount(id: number) {
  return useQuery<AccountWithBalance>({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch account");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ? JSON.stringify(json.error) : "Failed to create account");
      }
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUpdateAccount(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAccountInput) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ? JSON.stringify(json.error) : "Failed to update account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
    },
  });
}

export function useToggleAccountActive(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/accounts/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to toggle account");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
