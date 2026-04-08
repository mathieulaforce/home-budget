"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { formatDate, toISODate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils";

const ALL_ACCOUNTS = "__all__";
const ALL_CATEGORIES = "__all__";

export function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      router.push(`/transactions?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      updateParams({ search: search || null });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, updateParams]);

  const accountId = searchParams.get("accountId") ?? ALL_ACCOUNTS;
  const categoryId = searchParams.get("categoryId") ?? ALL_CATEGORIES;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const parsedStart = startDate ? new Date(startDate) : undefined;
  const parsedEnd = endDate ? new Date(endDate) : undefined;

  const [categoryOpen, setCategoryOpen] = useState(false);

  const selectedCategory = categories?.find(
    (c) => String(c.id) === categoryId
  );

  const hasFilters =
    accountId !== ALL_ACCOUNTS ||
    categoryId !== ALL_CATEGORIES ||
    startDate ||
    endDate ||
    search;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        value={accountId}
        onValueChange={(val) =>
          updateParams({
            accountId: val === ALL_ACCOUNTS ? null : val,
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ACCOUNTS}>All accounts</SelectItem>
          {accounts?.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" className="w-52 justify-start font-normal" />
          }
        >
          {selectedCategory ? selectedCategory.name : "All categories"}
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0">
          <Command>
            <CommandInput placeholder="Search category..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-categories"
                  onSelect={() => {
                    updateParams({ categoryId: null });
                    setCategoryOpen(false);
                  }}
                >
                  All categories
                </CommandItem>
                {categories?.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    data-checked={String(c.id) === categoryId || undefined}
                    onSelect={() => {
                      updateParams({ categoryId: String(c.id) });
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

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start font-normal",
                !parsedStart && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 size-4" />
          {parsedStart ? formatDate(parsedStart) : "Start date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsedStart}
            onSelect={(date) =>
              updateParams({
                startDate: date ? toISODate(date) : null,
              })
            }
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start font-normal",
                !parsedEnd && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 size-4" />
          {parsedEnd ? formatDate(parsedEnd) : "End date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsedEnd}
            onSelect={(date) =>
              updateParams({
                endDate: date ? toISODate(date) : null,
              })
            }
          />
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            router.push("/transactions");
          }}
        >
          <X className="mr-1 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
