"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { createTransactionSchema } from "@/lib/validators/transactions";
import { ApiError } from "@/lib/errors/api-error";
import { formatDate, toISODate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils";

const fieldSchemas = {
  description: createTransactionSchema.shape.description,
};

function extractErrors(meta: { errors: unknown[] }): string[] {
  return meta.errors.flatMap((e) => {
    if (typeof e === "string") return [e];
    if (e && typeof e === "object" && "message" in e)
      return [String((e as { message: string }).message)];
    return [];
  });
}

type TransactionFormDefaults = {
  accountId: number;
  categoryId: number | null;
  date: Date;
  description: string;
  amount: number;
  notes: string | null;
};

type TransactionFormProps = {
  onSuccess?: () => void;
} & (
  | { mode: "create"; transactionId?: never; defaultValues?: never }
  | {
      mode: "edit";
      transactionId: number;
      defaultValues: TransactionFormDefaults;
    }
);

export function TransactionForm({
  mode,
  transactionId,
  defaultValues,
  onSuccess,
}: TransactionFormProps) {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transactionId ?? 0);

  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string[]>
  >({});

  const defaultIsExpense = defaultValues
    ? defaultValues.amount < 0
    : true;
  const [isExpense, setIsExpense] = useState(defaultIsExpense);

  const defaultAmountDisplay = defaultValues
    ? String(Math.abs(defaultValues.amount) / 100)
    : "";
  const [amountInput, setAmountInput] = useState(defaultAmountDisplay);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      accountId: defaultValues?.accountId ?? 0,
      categoryId: defaultValues?.categoryId ?? null as number | null,
      date: defaultValues?.date ?? new Date(),
      description: defaultValues?.description ?? "",
      notes: defaultValues?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setServerFieldErrors({});

      const parsedAmount = parseFloat(amountInput.replace(",", "."));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setFormError("Please enter a valid positive amount");
        return;
      }

      const cents = Math.round(parsedAmount * 100);
      const signedCents = isExpense ? -cents : cents;

      const payload = {
        accountId: value.accountId,
        categoryId: value.categoryId,
        date: value.date,
        description: value.description,
        amount: signedCents,
        notes: value.notes || undefined,
      };

      try {
        if (mode === "create") {
          await createMutation.mutateAsync(payload);
          toast.success("Transaction created");
        } else {
          await updateMutation.mutateAsync(payload);
          toast.success("Transaction updated");
        }
        onSuccess?.();
        router.push("/transactions");
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
              ? "Failed to create transaction"
              : "Failed to update transaction"
          );
        }
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function getFieldErrors(
    fieldName: string,
    clientErrors: string[]
  ): string[] {
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
          const errors = getFieldErrors(
            "accountId",
            extractErrors(field.state.meta)
          );
          return (
            <div className="space-y-1.5">
              <label
                htmlFor="accountId"
                className="text-sm font-medium leading-none"
              >
                Account
              </label>
              <Select
                value={field.state.value ? String(field.state.value) : ""}
                onValueChange={(val) => field.handleChange(Number(val))}
              >
                <SelectTrigger
                  id="accountId"
                  className="w-full"
                  aria-invalid={errors.length > 0}
                >
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="date">
        {(field) => {
          const errors = getFieldErrors(
            "date",
            extractErrors(field.state.meta)
          );
          return (
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Date</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start font-normal",
                        !field.state.value && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {field.state.value
                    ? formatDate(field.state.value)
                    : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.state.value}
                    onSelect={(date) => {
                      if (date) {
                        field.handleChange(date);
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              {errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="description"
        validators={{ onChange: fieldSchemas.description }}
      >
        {(field) => {
          const errors = getFieldErrors(
            "description",
            extractErrors(field.state.meta)
          );
          return (
            <div className="space-y-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium leading-none"
              >
                Description
              </label>
              <Input
                id="description"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="e.g. Grocery shopping"
                aria-invalid={errors.length > 0}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {errors.join(", ")}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      <div className="space-y-1.5">
        <label htmlFor="amount" className="text-sm font-medium leading-none">
          Amount (EUR)
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-lg border">
            <button
              type="button"
              className={cn(
                "rounded-l-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isExpense
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => setIsExpense(true)}
            >
              Expense
            </button>
            <button
              type="button"
              className={cn(
                "rounded-r-lg px-3 py-1.5 text-sm font-medium transition-colors",
                !isExpense
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => setIsExpense(false)}
            >
              Income
            </button>
          </div>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || /^\d*[.,]?\d*$/.test(raw)) {
                setAmountInput(raw);
              }
            }}
            onBlur={() => {
              const num = parseFloat(amountInput.replace(",", "."));
              if (!isNaN(num)) {
                setAmountInput(String(num));
              }
            }}
            placeholder="0.00"
            className="flex-1"
          />
        </div>
      </div>

      <form.Field name="categoryId">
        {(field) => {
          const selectedCat = categories?.find(
            (c) => c.id === field.state.value
          );
          return (
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">
                Category
              </label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  {selectedCat ? selectedCat.name : "None (uncategorized)"}
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          data-checked={!field.state.value || undefined}
                          onSelect={() => {
                            field.handleChange(null);
                            setCategoryOpen(false);
                          }}
                        >
                          None (uncategorized)
                        </CommandItem>
                        {categories?.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            data-checked={
                              c.id === field.state.value || undefined
                            }
                            onSelect={() => {
                              field.handleChange(c.id);
                              setCategoryOpen(false);
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="notes">
        {(field) => {
          const errors = getFieldErrors(
            "notes",
            extractErrors(field.state.meta)
          );
          return (
            <div className="space-y-1.5">
              <label
                htmlFor="notes"
                className="text-sm font-medium leading-none"
              >
                Notes (optional)
              </label>
              <Textarea
                id="notes"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Additional details..."
                maxLength={500}
              />
              {errors.length > 0 && (
                <p className="text-sm text-destructive">
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
              ? "Create Transaction"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/transactions")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
