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
import { useAccounts } from "@/hooks/useAccounts";
import { useAddHolding, useUpdateHolding } from "@/hooks/useStocks";
import { addHoldingSchema } from "@/lib/validators/stocks";
import { ApiError } from "@/lib/errors/api-error";
import { toISODate } from "@/lib/utils/formatDate";

const fieldSchemas = {
  symbol: addHoldingSchema.shape.symbol,
  name: addHoldingSchema.shape.name,
};

function extractErrors(meta: { errors: unknown[] }): string[] {
  return meta.errors.flatMap((e) => {
    if (typeof e === "string") return [e];
    if (e && typeof e === "object" && "message" in e) return [String((e as { message: string }).message)];
    return [];
  });
}

type HoldingFormDefaults = {
  accountId: number;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
};

type HoldingFormProps = {
  onSuccess?: () => void;
} & (
  | { mode: "create"; holdingId?: never; defaultValues?: never }
  | { mode: "edit"; holdingId: number; defaultValues: HoldingFormDefaults }
);

export function HoldingForm({
  mode,
  holdingId,
  defaultValues,
  onSuccess,
}: HoldingFormProps) {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const addMutation = useAddHolding();
  const updateMutation = useUpdateHolding(holdingId ?? 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const investmentAccounts = accounts?.filter((a) => a.type === "investment") ?? [];

  const costDisplay = defaultValues ? String(defaultValues.costBasis / 100) : "";
  const [costInput, setCostInput] = useState(costDisplay);
  const [sharesInput, setSharesInput] = useState(
    defaultValues ? String(defaultValues.shares) : ""
  );

  const form = useForm({
    defaultValues: {
      accountId: defaultValues?.accountId ?? 0,
      symbol: defaultValues?.symbol ?? "",
      name: defaultValues?.name ?? "",
      shares: defaultValues?.shares ?? 0,
      costBasis: defaultValues?.costBasis ?? 0,
      purchaseDate: defaultValues?.purchaseDate ?? toISODate(new Date()),
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setServerFieldErrors({});

      const parsedCost = parseFloat(costInput.replace(",", "."));
      const costCents = isNaN(parsedCost) ? 0 : Math.round(parsedCost * 100);
      const parsedShares = parseFloat(sharesInput.replace(",", "."));
      const shares = isNaN(parsedShares) ? 0 : parsedShares;

      const payload = {
        ...value,
        shares,
        costBasis: costCents,
      };

      try {
        if (mode === "create") {
          await addMutation.mutateAsync(payload);
          toast.success("Holding added successfully");
        } else {
          await updateMutation.mutateAsync(payload);
          toast.success("Holding updated successfully");
        }
        onSuccess?.();
        router.push("/stocks");
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isFieldLevel) {
            setServerFieldErrors(err.fieldErrors!);
          } else {
            setFormError(err.message);
          }
        } else {
          setFormError(
            mode === "create" ? "Failed to add holding" : "Failed to update holding"
          );
        }
      }
    },
  });

  const isPending = addMutation.isPending || updateMutation.isPending;

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

      <form.Field name="accountId">
        {(field) => {
          const errors = getFieldErrors("accountId", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="accountId" className="text-sm font-medium leading-none">
                Investment Account
              </label>
              <Select
                value={field.state.value ? String(field.state.value) : ""}
                onValueChange={(val) => field.handleChange(Number(val))}
              >
                <SelectTrigger id="accountId" className="w-full" aria-invalid={errors.length > 0}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {investmentAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {investmentAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No investment accounts found. Create one first.
                </p>
              )}
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="symbol"
        validators={{ onChange: fieldSchemas.symbol }}
      >
        {(field) => {
          const errors = getFieldErrors("symbol", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="symbol" className="text-sm font-medium leading-none">
                Symbol
              </label>
              <Input
                id="symbol"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                onBlur={field.handleBlur}
                placeholder="e.g. VWCE.DE"
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="name"
        validators={{ onChange: fieldSchemas.name }}
      >
        {(field) => {
          const errors = getFieldErrors("name", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="holdingName" className="text-sm font-medium leading-none">
                Name
              </label>
              <Input
                id="holdingName"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="e.g. Vanguard FTSE All-World"
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="shares">
        {(field) => {
          const errors = getFieldErrors("shares", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="shares" className="text-sm font-medium leading-none">
                Shares
              </label>
              <Input
                id="shares"
                type="text"
                inputMode="decimal"
                value={sharesInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d*[.,]?\d*$/.test(raw)) {
                    setSharesInput(raw);
                    const num = parseFloat(raw.replace(",", "."));
                    if (!isNaN(num)) field.handleChange(num);
                    else if (raw === "") field.handleChange(0);
                  }
                }}
                onBlur={() => {
                  field.handleBlur();
                  const num = parseFloat(sharesInput.replace(",", "."));
                  if (!isNaN(num)) setSharesInput(String(num));
                  else setSharesInput("");
                }}
                placeholder="0"
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="costBasis">
        {(field) => {
          const errors = getFieldErrors("costBasis", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="costBasis" className="text-sm font-medium leading-none">
                Total Cost (EUR)
              </label>
              <Input
                id="costBasis"
                type="text"
                inputMode="decimal"
                value={costInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d*[.,]?\d*$/.test(raw)) {
                    setCostInput(raw);
                    const num = parseFloat(raw.replace(",", "."));
                    if (!isNaN(num)) field.handleChange(Math.round(num * 100));
                    else if (raw === "") field.handleChange(0);
                  }
                }}
                onBlur={() => {
                  field.handleBlur();
                  const num = parseFloat(costInput.replace(",", "."));
                  if (!isNaN(num)) setCostInput(String(num));
                  else setCostInput("");
                }}
                placeholder="0,00"
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="purchaseDate">
        {(field) => {
          const errors = getFieldErrors("purchaseDate", extractErrors(field.state.meta));
          return (
            <div className="space-y-1.5">
              <label htmlFor="purchaseDate" className="text-sm font-medium leading-none">
                Purchase Date
              </label>
              <Input
                id="purchaseDate"
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">{errors.join(", ")}</p>
              )}
            </div>
          );
        }}
      </form.Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Adding…"
              : "Saving…"
            : mode === "create"
              ? "Add Holding"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/stocks")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
