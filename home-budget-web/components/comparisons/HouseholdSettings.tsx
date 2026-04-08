"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BenchmarkRegion, HouseholdSize } from "@/lib/domain/comparisons/types";

interface HouseholdSettingsProps {
  region: BenchmarkRegion;
  householdSize: HouseholdSize;
  months: number;
  onRegionChange: (region: BenchmarkRegion) => void;
  onHouseholdSizeChange: (size: HouseholdSize) => void;
  onMonthsChange: (months: number) => void;
}

const regionOptions: { value: BenchmarkRegion; label: string }[] = [
  { value: "belgium", label: "Belgium" },
  { value: "flanders", label: "Flanders" },
  { value: "wallonia", label: "Wallonia" },
  { value: "brussels", label: "Brussels" },
];

const householdOptions: { value: HouseholdSize; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "couple", label: "Couple" },
  { value: "couple_1child", label: "Couple + 1 child" },
  { value: "couple_2children", label: "Couple + 2 children" },
  { value: "couple_3plus", label: "Couple + 3+ children" },
  { value: "single_parent", label: "Single parent" },
];

const monthOptions = [
  { value: 3, label: "Last 3 months" },
  { value: 6, label: "Last 6 months" },
  { value: 12, label: "Last 12 months" },
];

export function HouseholdSettings({
  region,
  householdSize,
  months,
  onRegionChange,
  onHouseholdSizeChange,
  onMonthsChange,
}: HouseholdSettingsProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Region
        </label>
        <Select
          value={region}
          onValueChange={(val) => onRegionChange(val as BenchmarkRegion)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regionOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Household
        </label>
        <Select
          value={householdSize}
          onValueChange={(val) => onHouseholdSizeChange(val as HouseholdSize)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {householdOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Averaging period
        </label>
        <Select
          value={String(months)}
          onValueChange={(val) => onMonthsChange(Number(val))}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
