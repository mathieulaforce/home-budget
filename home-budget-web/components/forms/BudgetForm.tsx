"use client";

import { useState, useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBudget } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { ApiError } from "@/lib/errors/api-error";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTH_OPTIONS = [
  { value: "", label: "Yearly (all months)" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

type BudgetItemRow = {
  categoryId: number;
  plannedAmount: string;
};

type BudgetFormProps = {
  mode: "create";
  onSuccess?: () => void;
};

export function BudgetForm({ mode, onSuccess }: BudgetFormProps) {
  const router = useRouter();
  const createMutation = useCreateBudget();
  const { data: categories = [] } = useCategories();
  const [formError, setFormError] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.isIncome),
    [categories]
  );

  const [items, setItems] = useState<BudgetItemRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && expenseCategories.length > 0) {
    setItems(
      expenseCategories.map((c) => ({
        categoryId: c.id,
        plannedAmount: "0",
      }))
    );
    setInitialized(true);
  }

  const totalPlanned = useMemo(() => {
    return items.reduce((sum, item) => {
      const val = parseFloat(item.plannedAmount.replace(",", "."));
      return sum + (isNaN(val) ? 0 : Math.round(val * 100));
    }, 0);
  }, [items]);

  const form = useForm({
    defaultValues: {
      name: "",
      year: CURRENT_YEAR,
      month: null as number | null,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);

      const parsedItems = items
        .filter((item) => item.categoryId > 0)
        .map((item) => {
          const val = parseFloat(item.plannedAmount.replace(",", "."));
          return {
            categoryId: item.categoryId,
            plannedAmount: isNaN(val) ? 0 : Math.round(val * 100),
          };
        });

      if (parsedItems.length === 0) {
        setFormError("At least one budget item is required");
        return;
      }

      const categoryIds = parsedItems.map((i) => i.categoryId);
      if (new Set(categoryIds).size !== categoryIds.length) {
        setFormError("Duplicate categories are not allowed");
        return;
      }

      const payload = {
        name: value.name,
        year: value.year,
        month: value.month,
        items: parsedItems,
      };

      try {
        await createMutation.mutateAsync(payload);
        toast.success("Budget created successfully");
        onSuccess?.();
        router.push("/budgets");
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(err.message);
        } else {
          setFormError("Failed to create budget");
        }
      }
    },
  });

  const addRow = () => {
    setItems((prev) => [...prev, { categoryId: 0, plannedAmount: "0" }]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof BudgetItemRow,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const usedCategoryIds = new Set(items.map((i) => i.categoryId));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
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

      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium leading-none">
              Name
            </label>
            <Input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g. Monthly Budget 2026"
            />
          </div>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="year">
          {(field) => (
            <div className="space-y-1.5">
              <label
                htmlFor="year"
                className="text-sm font-medium leading-none"
              >
                Year
              </label>
              <Select
                value={String(field.state.value)}
                onValueChange={(val) => field.handleChange(Number(val))}
              >
                <SelectTrigger id="year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <form.Field name="month">
          {(field) => (
            <div className="space-y-1.5">
              <label
                htmlFor="month"
                className="text-sm font-medium leading-none"
              >
                Month
              </label>
              <Select
                value={field.state.value != null ? String(field.state.value) : ""}
                onValueChange={(val) =>
                  field.handleChange(val === "" ? null : Number(val))
                }
              >
                <SelectTrigger id="month" className="w-full">
                  <SelectValue placeholder="Yearly (all months)" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Budget Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus data-icon="inline-start" />
            Add Row
          </Button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No items yet. Add a row or wait for categories to load.
          </p>
        )}

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={item.categoryId > 0 ? String(item.categoryId) : ""}
                  onValueChange={(val) =>
                    updateItem(index, "categoryId", Number(val))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={String(c.id)}
                        disabled={
                          usedCategoryIds.has(c.id) &&
                          c.id !== item.categoryId
                        }
                      >
                        {c.groupName} — {c.name}
                        {c.isIncome ? " (income)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.plannedAmount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" || /^-?\d*[.,]?\d*$/.test(raw)) {
                      updateItem(index, "plannedAmount", raw);
                    }
                  }}
                  onBlur={() => {
                    const val = parseFloat(
                      item.plannedAmount.replace(",", ".")
                    );
                    if (!isNaN(val)) {
                      updateItem(
                        index,
                        "plannedAmount",
                        val.toFixed(2)
                      );
                    } else {
                      updateItem(index, "plannedAmount", "0.00");
                    }
                  }}
                  placeholder="0,00 €"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                aria-label="Remove row"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t pt-3">
          <p className="text-sm font-medium">
            Total: {formatCurrency(totalPlanned)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create Budget"
              : "Save Budget"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/budgets")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
