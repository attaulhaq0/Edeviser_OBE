import { parseAsString, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getFilterOptions } from "@/lib/heatmapUtils";
import type { WellnessHabitType } from "@/types/habits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapFiltersProps {
  enabledWellnessHabits: WellnessHabitType[];
  onFilterChange?: (filter: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map display label back to a URL-safe filter value. */
const FILTER_VALUE_MAP: Record<string, string> = {
  "All Habits": "all",
  Login: "login",
  Submit: "submit",
  Journal: "journal",
  Read: "read",
  Meditation: "meditation",
  Hydration: "hydration",
  Exercise: "exercise",
  Sleep: "sleep",
};

/** Reverse lookup: filter value → display label. */
const FILTER_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FILTER_VALUE_MAP).map(([k, v]) => [v, k])
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HeatmapFilters = ({
  enabledWellnessHabits,
  onFilterChange,
}: HeatmapFiltersProps) => {
  const [filter, setFilter] = useQueryState(
    "habit",
    parseAsString.withDefault("all")
  );

  const options = getFilterOptions(enabledWellnessHabits);

  const handleChange = (value: string) => {
    setFilter(value);
    onFilterChange?.(value);
  };

  return (
    <Tabs
      value={filter}
      onValueChange={handleChange}
      data-testid="heatmap-filters"
    >
      <TabsList
        className="flex flex-wrap gap-2 bg-transparent h-auto p-0"
        data-testid="heatmap-filter-list"
      >
        {options.map((label) => {
          const value = FILTER_VALUE_MAP[label] ?? label.toLowerCase();
          const isActive = filter === value;

          return (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-slate-50"
              )}
              data-testid={`filter-${value}`}
            >
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export { FILTER_VALUE_MAP, FILTER_LABEL_MAP };
export default HeatmapFilters;
