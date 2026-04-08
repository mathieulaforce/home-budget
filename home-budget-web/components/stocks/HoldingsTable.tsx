"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HoldingSummary } from "@/lib/domain/stocks/types";
import { useDeleteHolding } from "@/hooks/useStocks";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function GainLossCell({ value, percent }: { value: number | null; percent: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const color = value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  return (
    <span className={color}>
      {formatCurrency(value)}
      {percent !== null && (
        <span className="ml-1 text-xs">({percent >= 0 ? "+" : ""}{percent.toFixed(1)}%)</span>
      )}
    </span>
  );
}

export function HoldingsTable({ holdings }: { holdings: HoldingSummary[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "currentValue", desc: true },
  ]);
  const deleteMutation = useDeleteHolding();

  const handleDelete = useCallback(async (id: number, symbol: string) => {
    if (!confirm(`Delete holding ${symbol}?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`${symbol} deleted`);
    } catch {
      toast.error("Failed to delete holding");
    }
  }, [deleteMutation]);

  const totals = useMemo(() => {
    const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
    const totalValue = holdings.reduce((s, h) => s + (h.currentValue ?? 0), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalReturn = totalCost ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalCost, totalValue, totalGainLoss, totalReturn };
  }, [holdings]);

  const columns = useMemo<ColumnDef<HoldingSummary>[]>(
    () => [
      {
        id: "symbol",
        accessorKey: "symbol",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Symbol
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.symbol}</span>
            <span className="ml-2 text-xs text-muted-foreground">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "shares",
        header: "Shares",
        cell: ({ getValue }) => (getValue() as number).toLocaleString("nl-BE", { maximumFractionDigits: 4 }),
      },
      {
        id: "avgCost",
        header: "Avg Cost",
        accessorFn: (row) =>
          row.shares > 0 ? row.costBasis / row.shares : 0,
        cell: ({ getValue }) => formatCurrency(Math.round(getValue() as number)),
      },
      {
        id: "price",
        header: "Price",
        accessorFn: (row) => row.latestPrice,
        cell: ({ row }) => {
          const { latestPrice, isStale } = row.original;
          if (latestPrice === null) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="inline-flex items-center gap-1">
              {formatCurrency(latestPrice)}
              {isStale && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="size-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Price may be stale</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
          );
        },
      },
      {
        id: "currentValue",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Value
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        accessorFn: (row) => row.currentValue ?? 0,
        cell: ({ row }) => {
          const v = row.original.currentValue;
          return v !== null ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "gainLoss",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Gain/Loss
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        accessorFn: (row) => row.gainLoss ?? 0,
        cell: ({ row }) => (
          <GainLossCell
            value={row.original.gainLoss}
            percent={row.original.returnPercent}
          />
        ),
      },
      {
        id: "allocation",
        header: "Alloc %",
        accessorFn: (row) => row.allocationPercent ?? 0,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return v > 0 ? (
            <Badge variant="secondary">{v.toFixed(1)}%</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDelete(row.original.id, row.original.symbol)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            <span className="sr-only">Delete {row.original.symbol}</span>
          </Button>
        ),
      },
    ],
    [deleteMutation.isPending, handleDelete]
  );

  const table = useReactTable({
    data: holdings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                No holdings yet
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {holdings.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">
                Total
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="font-medium">
                {formatCurrency(totals.totalValue)}
              </TableCell>
              <TableCell>
                <GainLossCell value={totals.totalGainLoss} percent={totals.totalReturn} />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">100%</Badge>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
