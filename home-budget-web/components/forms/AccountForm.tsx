"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAccount, useUpdateAccount } from "@/hooks/useAccounts";
import { ACCOUNT_TYPE_OPTIONS, type AccountType } from "@/lib/constants/accounts";

interface AccountFormProps {
  mode: "create" | "edit";
  accountId?: number;
  defaultValues?: {
    name: string;
    type: AccountType;
    currency: string;
    initialBalance: number;
  };
  onSuccess?: () => void;
}

export function AccountForm({
  mode,
  accountId,
  defaultValues,
  onSuccess,
}: AccountFormProps) {
  const router = useRouter();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount(accountId ?? 0);

  const form = useForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: (defaultValues?.type ?? "checking") as AccountType,
      currency: defaultValues?.currency ?? "EUR",
      initialBalance: defaultValues ? defaultValues.initialBalance / 100 : 0,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        initialBalance: Math.round(value.initialBalance * 100),
      };

      try {
        if (mode === "create") {
          await createMutation.mutateAsync(payload);
          toast.success("Account created successfully");
        } else {
          await updateMutation.mutateAsync(payload);
          toast.success("Account updated successfully");
        }
        onSuccess?.();
        router.push("/accounts");
      } catch {
        toast.error(
          mode === "create"
            ? "Failed to create account"
            : "Failed to update account"
        );
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="name"
        validators={{
          onChange: z.string().min(1, "Name is required").max(100),
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium leading-none"
            >
              Name
            </label>
            <Input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g. ING Checking"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="type"
        validators={{
          onChange: z.enum([
            "checking",
            "savings",
            "investment",
            "credit_card",
          ]),
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <label
              htmlFor="type"
              className="text-sm font-medium leading-none"
            >
              Type
            </label>
            <Select
              value={field.state.value}
              onValueChange={(val) => field.handleChange(val as AccountType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="currency"
        validators={{
          onChange: z.string().regex(/^[A-Z]{3}$/, "Must be a 3-letter currency code"),
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <label
              htmlFor="currency"
              className="text-sm font-medium leading-none"
            >
              Currency
            </label>
            <Input
              id="currency"
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value.toUpperCase())
              }
              onBlur={field.handleBlur}
              placeholder="EUR"
              maxLength={3}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="initialBalance"
        validators={{
          onChange: z.number(),
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <label
              htmlFor="initialBalance"
              className="text-sm font-medium leading-none"
            >
              Initial Balance (€)
            </label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(parseFloat(e.target.value) || 0)
              }
              onBlur={field.handleBlur}
              placeholder="0.00"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create Account"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/accounts")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
