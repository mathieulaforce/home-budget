"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PeriodSelection } from "@/lib/domain/shared/types";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

interface PeriodSelectorProps {
  selection: PeriodSelection;
  onChange?: (selection: PeriodSelection) => void;
}

export function PeriodSelector({ selection, onChange }: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncUrl = useCallback(
    (next: PeriodSelection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", next.type);
      if (next.type === "month") {
        params.set("year", String(next.year));
        params.set("month", String(next.month));
      } else if (next.type === "year") {
        params.set("year", String(next.year));
        params.delete("month");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
      onChange?.(next);
    },
    [router, searchParams, onChange]
  );

  const goPrev = () => {
    if (selection.type === "month") {
      const prev =
        selection.month === 1
          ? { type: "month" as const, year: selection.year - 1, month: 12 }
          : {
              type: "month" as const,
              year: selection.year,
              month: selection.month - 1,
            };
      syncUrl(prev);
    } else if (selection.type === "year") {
      syncUrl({ type: "year", year: selection.year - 1 });
    }
  };

  const goNext = () => {
    if (selection.type === "month") {
      const next =
        selection.month === 12
          ? { type: "month" as const, year: selection.year + 1, month: 1 }
          : {
              type: "month" as const,
              year: selection.year,
              month: selection.month + 1,
            };
      syncUrl(next);
    } else if (selection.type === "year") {
      syncUrl({ type: "year", year: selection.year + 1 });
    }
  };

  const toggleMode = () => {
    if (selection.type === "month") {
      syncUrl({ type: "year", year: selection.year });
    } else {
      const now = new Date();
      syncUrl({
        type: "month",
        year: selection.type === "year" ? selection.year : now.getFullYear(),
        month: now.getMonth() + 1,
      });
    }
  };

  const label =
    selection.type === "month"
      ? `${MONTH_NAMES[selection.month - 1]} ${selection.year}`
      : String(selection.type === "year" ? selection.year : "");

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={goPrev}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium">
        {label}
      </span>
      <Button variant="outline" size="icon-sm" onClick={goNext}>
        <ChevronRight className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleMode}>
        {selection.type === "month" ? "Year" : "Month"}
      </Button>
    </div>
  );
}

export function usePeriodFromParams(): PeriodSelection {
  const searchParams = useSearchParams();
  const now = new Date();
  const type = searchParams.get("type") ?? "month";
  if (type === "year") {
    return {
      type: "year",
      year: Number(searchParams.get("year")) || now.getFullYear(),
    };
  }
  return {
    type: "month",
    year: Number(searchParams.get("year")) || now.getFullYear(),
    month: Number(searchParams.get("month")) || now.getMonth() + 1,
  };
}
