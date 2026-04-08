"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
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
import { createAccountSchema } from "@/lib/validators/accounts";
import { ApiError } from "@/lib/errors/api-error";
import { ACCOUNT_TYPE_OPTIONS, type AccountType } from "@/lib/constants/accounts";

const fieldSchemas = {
  name: createAccountSchema.shape.name,
  type: createAccountSchema.shape.type,
  currency: createAccountSchema.shape.currency.removeDefault(),
};

function extractErrors(meta: { errors: unknown[] }): string[] {
  return meta.errors.flatMap((e) => {
    if (typeof e === "string") return [e];
    if (e && typeof e === "object" && "message" in e) return [String((e as { message: string }).message)];
    return [];
  });
}

type AccountFormDefaults = {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
};

type AccountFormProps = {
  onSuccess?: () => void;
} & (
  | { mode: "create"; accountId?: never; defaultValues?: never }
  | { mode: "edit"; accountId: number; defaultValues: AccountFormDefaults }
);

export function AccountForm({
  mode,
  accountId,
  defaultValues,
  onSuccess,
}: AccountFormProps) {
  const router = useRouter();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount(accountId ?? 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const initialBalanceDisplay = defaultValues
    ? String(defaultValues.initialBalance / 100)
    : "0";
  const [balanceInput, setBalanceInput] = useState(initialBalanceDisplay);

  const form = useForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: (defaultValues?.type ?? "checking") as AccountType,
      currency: defaultValues?.currency ?? "EUR",
      initialBalance: defaultValues ? defaultValues.initialBalance / 100 : 0,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setServerFieldErrors({});

      const parsedBalance = parseFloat(balanceInput);
      const balanceEuros = isNaN(parsedBalance) ? 0 : parsedBalance;
      const payload = {
        ...value,
        initialBalance: Math.round(balanceEuros * 100),
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
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isFieldLevel) {
            setServerFieldErrors(err.fieldErrors!);
          } else {
            setFormError(err.message);
          }
        } else {
          setFormError(
            mode === "create"
              ? "Failed to create account"
              : "Failed to update account"
          );
        }
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function getFieldErrors(fieldName: string, clientErrors: string[]): string[] {
    const serverErrs = serverFieldErrors[fieldName] ?? [];
    return [...clientErrors, ...serverErrs];
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {formError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <form.Field
        name="name"
        validators={{ onChange: fieldSchemas.name }}
      >
        {(field) => {
          const errors = getFieldErrors("name", extractErrors(field.state.meta));
          return (
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
                aria-invalid={errors.length > 0}
                aria-describedby={errors.length > 0 ? "name-error" : undefined}
              />
              {errors.length > 0 && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="type"
        validators={{ onChange: fieldSchemas.type }}
      >
        {(field) => {
          const errors = getFieldErrors("type", extractErrors(field.state.meta));
          return (
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
                <SelectTrigger id="type" className="w-full" aria-invalid={errors.length > 0} aria-describedby={errors.length > 0 ? "type-error" : undefined}>
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
              {errors.length > 0 && (
                <p id="type-error" className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="currency"
        validators={{ onChange: fieldSchemas.currency }}
      >
        {(field) => {
          const errors = getFieldErrors("currency", extractErrors(field.state.meta));
          return (
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
                aria-invalid={errors.length > 0}
                aria-describedby={errors.length > 0 ? "currency-error" : undefined}
              />
              {errors.length > 0 && (
                <p id="currency-error" className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="initialBalance">
        {(field) => {
          const errors = getFieldErrors("initialBalance", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label
                htmlFor="initialBalance"
                className="text-sm font-medium leading-none"
              >
                <form.Subscribe selector={(state) => state.values.currency}>
                  {(currency) => <>Initial Balance ({currency})</>}
                </form.Subscribe>
              </label>
              <Input
                id="initialBalance"
                type="text"
                inputMode="decimal"
                value={balanceInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
                    setBalanceInput(raw);
                    const num = parseFloat(raw);
                    if (!isNaN(num)) {
                      field.handleChange(num);
                    } else if (raw === "" || raw === "-") {
                      field.handleChange(0);
                    }
                  }
                }}
                onBlur={(e) => {
                  field.handleBlur();
                  const num = parseFloat(balanceInput);
                  if (!isNaN(num)) {
                    setBalanceInput(String(num));
                  } else {
                    setBalanceInput("0");
                    field.handleChange(0);
                  }
                }}
                placeholder="0.00"
                aria-invalid={errors.length > 0}
                aria-describedby={errors.length > 0 ? "initialBalance-error" : undefined}
              />
              {errors.length > 0 && (
                <p id="initialBalance-error" className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
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
