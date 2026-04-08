import { useQuery } from "@tanstack/react-query";
import type { PeriodSelection } from "@/lib/domain/shared/types";
import type { DashboardPayload } from "@/lib/domain/dashboard/types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  period: (selection: PeriodSelection) =>
    ["dashboard", selection] as const,
};

function buildSearchParams(selection: PeriodSelection): string {
  const params = new URLSearchParams();
  params.set("type", selection.type);

  if (selection.type === "month") {
    params.set("year", String(selection.year));
    params.set("month", String(selection.month));
  } else if (selection.type === "year") {
    params.set("year", String(selection.year));
  }

  return params.toString();
}

export function useDashboard(selection: PeriodSelection) {
  return useQuery<DashboardPayload>({
    queryKey: dashboardKeys.period(selection),
    queryFn: async () => {
      const qs = buildSearchParams(selection);
      const res = await fetch(`/api/dashboard?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      return json.data;
    },
  });
}
