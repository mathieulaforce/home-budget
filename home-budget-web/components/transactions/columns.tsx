"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TransactionRow } from "@/lib/domain/transactions/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
];

function groupColor(groupName: string | null): string {
  if (!groupName) return "bg-muted text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = (hash * 31 + groupName.charCodeAt(i)) | 0;
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

type ColumnActions = {
  onEdit: (row: TransactionRow) => void;
  onDelete: (row: TransactionRow) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<TransactionRow>[] {
  return [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const desc = row.original.description;
        const truncated = desc.length > 50;
        if (!truncated) return <span>{desc}</span>;
        return (
          <Tooltip>
            <TooltipTrigger className="text-left">
              {desc.slice(0, 50)}…
            </TooltipTrigger>
            <TooltipContent>{desc}</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const { categoryName, categoryGroup } = row.original;
        if (!categoryName) {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              Uncategorized
            </Badge>
          );
        }
        return (
          <Badge
            variant="secondary"
            className={cn("border-transparent", groupColor(categoryGroup))}
          >
            {categoryName}
          </Badge>
        );
      },
    },
    {
      accessorKey: "accountName",
      header: "Account",
      cell: ({ row }) => row.original.accountName,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            className="-mr-3 h-8"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Amount
            <ArrowUpDown className="ml-1 size-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <div
            className={cn(
              "text-right font-medium",
              amount > 0 && "text-emerald-600",
              amount < 0 && "text-red-600"
            )}
          >
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="size-8 p-0" />
            }
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => actions.onDelete(row.original)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
