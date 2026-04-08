export type PeriodSelection =
  | { type: "month"; year: number; month: number }
  | { type: "year"; year: number }
  | { type: "custom"; startDate: Date; endDate: Date };

export interface DateRange {
  start: Date;
  end: Date;
}

export function periodToRange(selection: PeriodSelection): DateRange {
  switch (selection.type) {
    case "month":
      return {
        start: new Date(selection.year, selection.month - 1, 1),
        end: new Date(selection.year, selection.month, 0, 23, 59, 59, 999),
      };
    case "year":
      return {
        start: new Date(selection.year, 0, 1),
        end: new Date(selection.year, 11, 31, 23, 59, 59, 999),
      };
    case "custom":
      return { start: selection.startDate, end: selection.endDate };
  }
}

export function previousPeriod(selection: PeriodSelection): PeriodSelection {
  switch (selection.type) {
    case "month": {
      const prevMonth = selection.month - 1;
      if (prevMonth < 1) {
        return { type: "month", year: selection.year - 1, month: 12 };
      }
      return { type: "month", year: selection.year, month: prevMonth };
    }
    case "year":
      return { type: "year", year: selection.year - 1 };
    case "custom": {
      const duration =
        selection.endDate.getTime() - selection.startDate.getTime();
      return {
        type: "custom",
        startDate: new Date(selection.startDate.getTime() - duration),
        endDate: new Date(selection.startDate.getTime() - 1),
      };
    }
  }
}
