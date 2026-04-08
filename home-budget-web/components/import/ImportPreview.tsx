"use client";

import { useMemo, useRef } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { SerializedPreviewRow } from "@/lib/actions/import";
import type { Category } from "@/hooks/useCategories";

interface ImportPreviewProps {
  rows: SerializedPreviewRow[];
  categories: Category[];
  onToggleRow: (rowKey: string) => void;
  onToggleAll: (included: boolean) => void;
  onCategoryChange: (rowKey: string, categoryId: number | null) => void;
}

const columnHelper = createColumnHelper<SerializedPreviewRow>();

function formatDateNlBE(iso: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

const ROW_HEIGHT = 40;

export function ImportPreview({
  rows,
  categories,
  onToggleRow,
  onToggleAll,
  onCategoryChange,
}: ImportPreviewProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const allIncludedChecked = useMemo(() => {
    const eligible = rows.filter((r) => !r.isDuplicate);
    return eligible.length > 0 && eligible.every((r) => r.included);
  }, [rows]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const groupedCategories = useMemo(() => {
    const groups = new Map<string, Category[]>();
    for (const cat of categories) {
      const group = groups.get(cat.groupName) ?? [];
      group.push(cat);
      groups.set(cat.groupName, group);
    }
    return groups;
  }, [categories]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        size: 40,
        header: () => (
          <input
            type="checkbox"
            checked={allIncludedChecked}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.included}
            disabled={row.original.isDuplicate}
            onChange={() => onToggleRow(row.original.rowKey)}
            className="size-4 rounded border-input accent-primary disabled:opacity-40"
          />
        ),
      }),
      columnHelper.accessor("date", {
        header: "Datum",
        size: 110,
        cell: (info) => (
          <span className="tabular-nums">{formatDateNlBE(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Omschrijving",
        size: 320,
        cell: (info) => (
          <span className="block max-w-80 truncate" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Bedrag",
        size: 120,
        cell: (info) => {
          const amount = info.getValue();
          return (
            <span
              className={`tabular-nums font-medium ${amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(amount)}
            </span>
          );
        },
      }),
      columnHelper.accessor("categoryId", {
        header: "Categorie",
        size: 180,
        cell: ({ row }) => {
          const currentId = row.original.categoryId;
          const current = currentId ? categoryMap.get(currentId) : null;

          return (
            <Select
              value={currentId ?? undefined}
              onValueChange={(val: number | null) =>
                onCategoryChange(row.original.rowKey, val)
              }
            >
              <SelectTrigger size="sm" className="h-7 w-44 text-xs">
                <SelectValue placeholder="Geen categorie">
                  {current?.name ?? "Geen categorie"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[...groupedCategories.entries()].map(([group, cats]) => (
                  <div key={group}>
                    <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                      {group}
                    </div>
                    {cats.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => {
          if (row.original.isDuplicate) {
            return <Badge variant="secondary">Duplicaat</Badge>;
          }
          if (!row.original.included) {
            return <Badge variant="outline">Overgeslagen</Badge>;
          }
          return <Badge variant="default">Nieuw</Badge>;
        },
      }),
    ],
    [
      allIncludedChecked,
      categoryMap,
      groupedCategories,
      onToggleRow,
      onToggleAll,
      onCategoryChange,
    ]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.rowKey,
  });

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <div
      ref={parentRef}
      className="relative max-h-[60vh] overflow-auto rounded-lg border"
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm [&_tr]:border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-10 px-2 text-left align-middle font-medium text-foreground"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          className="relative"
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = tableRows[virtualRow.index];
            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={(node) => virtualizer.measureElement(node)}
                className={`absolute w-full border-b transition-colors ${
                  row.original.isDuplicate
                    ? "bg-muted/30 opacity-60"
                    : "hover:bg-muted/50"
                }`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-2 align-middle"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
