"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Copy,
  TrendingDown,
  TrendingUp,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetComparisonChart } from "@/components/charts/BudgetComparison";
import {
  useDeleteBudget,
  useDuplicateBudget,
  useBudgetComparison,
} from "@/hooks/useBudgets";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type {
  BudgetVsActualResult,
  BudgetComparison,
} from "@/lib/domain/budgets/types";

function isVarianceBad(c: BudgetComparison): boolean {
  if (c.isIncome) return c.variance < 0;
  return c.variance > 0;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTH_OPTIONS = [
  { value: "", label: "Yearly" },
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

type Props = {
  initialData: BudgetVsActualResult;
};

export function BudgetDetailClient({ initialData }: Props) {
  const router = useRouter();
  const deleteMutation = useDeleteBudget();
  const duplicateMutation = useDuplicateBudget();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [dupName, setDupName] = useState("");
  const [dupYear, setDupYear] = useState(CURRENT_YEAR);
  const [dupMonth, setDupMonth] = useState<number | null>(null);

  const { data } = useBudgetComparison(initialData.budget.id);
  const result = data ?? initialData;

  const { budget, comparisons, totalPlanned, totalActual, totalVariance } =
    result;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(budget.id);
      toast.success("Budget deleted");
      router.push("/budgets");
    } catch {
      toast.error("Failed to delete budget");
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await duplicateMutation.mutateAsync({
        id: budget.id,
        input: {
          name: dupName || `${budget.name} (copy)`,
          targetYear: dupYear,
          targetMonth: dupMonth,
        },
      });
      toast.success("Budget duplicated");
      setDuplicateOpen(false);
      const newId = (res as { data: { id: number } }).data.id;
      router.push(`/budgets/${newId}`);
    } catch {
      toast.error("Failed to duplicate budget");
    }
  };

  const openDuplicate = () => {
    setDupName(`${budget.name} (copy)`);
    setDupYear(budget.year);
    setDupMonth(budget.month);
    setDuplicateOpen(true);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/budgets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Budgets
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{budget.name}</h1>
          <p className="text-sm text-muted-foreground">
            {budget.month != null
              ? `${budget.month}/${budget.year}`
              : `${budget.year} (yearly)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openDuplicate}>
            <Copy data-icon="inline-start" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planned
            </CardTitle>
            <Target className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalPlanned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actual
            </CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalActual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
            {totalVariance > 0 ? (
              <TrendingUp className="size-4 text-red-500" />
            ) : (
              <TrendingDown className="size-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                totalVariance > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {totalVariance > 0 ? "+" : ""}
              {formatCurrency(totalVariance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetComparisonChart comparisons={comparisons} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No budget items.
                  </TableCell>
                </TableRow>
              ) : (
                comparisons.map((c) => {
                  const bad = isVarianceBad(c);
                  return (
                    <TableRow key={c.categoryId}>
                      <TableCell className="font-medium">
                        {c.categoryName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.groupName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.planned)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          bad
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {c.variance > 0 ? "+" : ""}
                        {formatCurrency(c.variance)}
                        {c.variancePercent != null && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({c.variancePercent > 0 ? "+" : ""}
                            {c.variancePercent.toFixed(0)}%)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{budget.name}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Budget</DialogTitle>
            <DialogDescription>
              Create a copy of this budget for a different period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label
                htmlFor="dup-name"
                className="text-sm font-medium leading-none"
              >
                Name
              </label>
              <Input
                id="dup-name"
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="dup-year"
                  className="text-sm font-medium leading-none"
                >
                  Year
                </label>
                <Select
                  value={String(dupYear)}
                  onValueChange={(v) => setDupYear(Number(v))}
                >
                  <SelectTrigger id="dup-year" className="w-full">
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
              <div className="space-y-1.5">
                <label
                  htmlFor="dup-month"
                  className="text-sm font-medium leading-none"
                >
                  Month
                </label>
                <Select
                  value={dupMonth != null ? String(dupMonth) : ""}
                  onValueChange={(v) =>
                    setDupMonth(v === "" ? null : Number(v))
                  }
                >
                  <SelectTrigger id="dup-month" className="w-full">
                    <SelectValue placeholder="Yearly" />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
