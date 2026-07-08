import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  HeatmapDay,
  DateRange,
  StudentHabitLevel,
  ComebackChallengeStatus,
  StreakMilestone,
} from "@/types/habits";
import { getIntensityLevel, isDateFuture, generateAriaLabel } from "@/lib/heatmapUtils";
import {
  getLevelAwareIntensityLevel,
  getLevelForDate,
} from "@/lib/levelAwareHeatmap";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gap between cells, in px. Kept small and integer so cells stay pixel-crisp. */
const CELL_GAP = 3;
/** Fixed cell size (px). DOM boxes at integer sizes never blur (unlike a
 *  CSS-scaled SVG). Cells stay square on every breakpoint; the track scrolls
 *  horizontally when the range is wider than the container. */
const CELL_SIZE = 15;
/** Width reserved for the sticky weekday label column. */
const WEEKDAY_COL_W = 30;
/** Height reserved for the month label row above the grid. */
const MONTH_ROW_H = 18;
/** Days-of-week rendered in the label column (Mon=row0, Wed=row2, Fri=row4). */
const WEEKDAY_ROWS = 7;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Weekday label per grid row. Weeks are Monday-aligned (ISO). */
const DAY_LABELS: Array<{ label: string; row: number }> = [
  { label: "Mon", row: 0 },
  { label: "Wed", row: 2 },
  { label: "Fri", row: 4 },
];

/** Intensity → CSS custom property (defined in index.css, dark-mode aware). */
const INTENSITY_COLORS: Record<number, string> = {
  0: "var(--heatmap-empty)",
  1: "var(--heatmap-level-1)",
  2: "var(--heatmap-level-2)",
  3: "var(--heatmap-level-3)",
  4: "var(--heatmap-level-4)",
};

const LEGEND_LABELS_DEFAULT = ["No activity", "", "", "", "4+ habits"];

/**
 * Level-relative legend labels. For a level-capped student the top swatch reads
 * "N/N habits"; otherwise it falls back to the absolute "4+ habits" scale.
 */
function getLegendLabels(studentLevel?: StudentHabitLevel): string[] {
  if (!studentLevel) return LEGEND_LABELS_DEFAULT;
  const max = studentLevel.currentLevel;
  return ["No activity", "", "", "", `${max}/${max} habits`];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HeatmapGridProps {
  data: HeatmapDay[];
  semesterRange: DateRange;
  studentLevel?: StudentHabitLevel;
  comebackChallenge?: ComebackChallengeStatus;
  sabbaticalEnabled?: boolean;
  milestones?: StreakMilestone[];
  onCellClick?: (date: string) => void;
  onCellHover?: (date: string | null) => void;
}

// ---------------------------------------------------------------------------
// Grid model — Monday-aligned weeks with leading/trailing padding
// ---------------------------------------------------------------------------

interface DaySlot {
  kind: "day";
  date: string;
  count: number;
  isFuture: boolean;
  /** Index into the sequence of real days (drives roving tabindex + arrows). */
  logicalIndex: number;
}
interface PadSlot {
  kind: "pad";
}
type Slot = DaySlot | PadSlot;

interface GridModel {
  slots: Slot[];
  numCols: number;
  dayCount: number;
}

function formatISO(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Monday-based weekday index (Mon=0 … Sun=6). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Builds the flat slot list in column-major order so a CSS grid with
 * `grid-auto-flow: column` + 7 rows places each day on its true weekday row.
 * Leading padding aligns the first date to its weekday; trailing padding
 * completes the final week column. Padding slots are decorative (no role).
 */
function buildGridModel(data: HeatmapDay[], range: DateRange): GridModel {
  if (!range.start || !range.end) {
    return { slots: [], numCols: 0, dayCount: 0 };
  }

  const dataMap = new Map<string, number>();
  for (const d of data) dataMap.set(d.date, d.totalCount);

  const start = new Date(range.start + "T00:00:00");
  const end = new Date(range.end + "T00:00:00");

  const slots: Slot[] = [];
  const leadingPad = mondayIndex(start);
  for (let i = 0; i < leadingPad; i++) slots.push({ kind: "pad" });

  const cursor = new Date(start);
  let logicalIndex = 0;
  while (cursor <= end) {
    const date = formatISO(cursor);
    slots.push({
      kind: "day",
      date,
      count: dataMap.get(date) ?? 0,
      isFuture: isDateFuture(date),
      logicalIndex: logicalIndex++,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  while (slots.length % WEEKDAY_ROWS !== 0) slots.push({ kind: "pad" });

  return {
    slots,
    numCols: slots.length / WEEKDAY_ROWS,
    dayCount: logicalIndex,
  };
}

/** First column at which each month begins — for month labels above the grid. */
function computeMonthLabels(
  slots: Slot[]
): Array<{ month: string; col: number }> {
  const labels: Array<{ month: string; col: number }> = [];
  let lastMonth = -1;
  slots.forEach((slot, pos) => {
    if (slot.kind !== "day") return;
    const month = new Date(slot.date + "T00:00:00").getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        month: MONTH_NAMES[month] ?? "",
        col: Math.floor(pos / WEEKDAY_ROWS),
      });
    }
  });
  return labels;
}

// ---------------------------------------------------------------------------
// Overlay predicates (Comeback Challenge / Sabbatical / Milestone)
// ---------------------------------------------------------------------------

function isComebackChallengeDate(
  date: string,
  challenge: ComebackChallengeStatus | undefined
): boolean {
  if (!challenge?.active || !challenge.startDate) return false;
  const start = new Date(challenge.startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const d = new Date(date + "T00:00:00");
  return d >= start && d <= end;
}

function isSabbaticalRestDay(date: string, enabled: boolean): boolean {
  if (!enabled) return false;
  const dow = new Date(date + "T00:00:00").getDay();
  return dow === 0 || dow === 6;
}

function getMilestoneForDate(
  date: string,
  milestones: StreakMilestone[] | undefined
): StreakMilestone | undefined {
  return milestones?.find((m) => m.achievedDate === date);
}

function comebackDayNumberFor(
  date: string,
  challenge: ComebackChallengeStatus
): number {
  if (!challenge.startDate) return 0;
  const start = new Date(challenge.startDate + "T00:00:00");
  const d = new Date(date + "T00:00:00");
  return Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function findDayByLogicalIndex(
  slots: Slot[],
  logicalIndex: number
): DaySlot | undefined {
  for (const slot of slots) {
    if (slot.kind === "day" && slot.logicalIndex === logicalIndex) return slot;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Cell — memoized so hovering/focusing one cell never re-renders the others
// ---------------------------------------------------------------------------

interface HeatmapCellProps {
  slot: DaySlot;
  intensity: number;
  size: number;
  isRovingTarget: boolean;
  isComeback: boolean;
  isSabbatical: boolean;
  milestone: StreakMilestone | undefined;
  comebackDayNumber: number;
  onKeyDown: (e: ReactKeyboardEvent, index: number) => void;
  onFocusCell: (index: number, date: string, isFuture: boolean) => void;
  onBlurCell: () => void;
  onHover: (date: string | null) => void;
  onClick: (date: string) => void;
  registerRef: (index: number, el: HTMLDivElement | null) => void;
}

const HeatmapCell = memo(function HeatmapCell({
  slot,
  intensity,
  size,
  isRovingTarget,
  isComeback,
  isSabbatical,
  milestone,
  comebackDayNumber,
  onKeyDown,
  onFocusCell,
  onBlurCell,
  onHover,
  onClick,
  registerRef,
}: HeatmapCellProps) {
  const { date, count, isFuture, logicalIndex } = slot;

  return (
    <div
      ref={(el) => registerRef(logicalIndex, el)}
      role="gridcell"
      aria-label={generateAriaLabel(date, count)}
      aria-disabled={isFuture}
      tabIndex={isRovingTarget ? 0 : -1}
      data-date={date}
      data-level={intensity}
      data-future={isFuture ? "true" : "false"}
      data-testid={`heatmap-cell-${date}`}
      className={cn(
        "relative rounded-[3px] outline-none",
        "shadow-[inset_0_0_0_1px_var(--heatmap-cell-outline)]",
        "motion-safe:transition-[box-shadow] motion-safe:duration-150",
        isFuture
          ? "opacity-40 cursor-default"
          : "cursor-pointer hover:z-10 hover:shadow-[inset_0_0_0_2px_var(--heatmap-cell-ring)]",
        "focus-visible:z-10 focus-visible:shadow-[inset_0_0_0_2px_var(--brand-primary)]"
      )}
      style={{ width: size, height: size, backgroundColor: INTENSITY_COLORS[intensity] }}
      onKeyDown={(e) => onKeyDown(e, logicalIndex)}
      onFocus={() => onFocusCell(logicalIndex, date, isFuture)}
      onBlur={onBlurCell}
      onMouseEnter={() => !isFuture && onHover(date)}
      onMouseLeave={() => onHover(null)}
      onClick={() => !isFuture && onClick(date)}
    >
      {/* Comeback Challenge — dashed teal ring */}
      {isComeback && (
        <span
          role="img"
          aria-label={`Comeback Day ${comebackDayNumber}/3`}
          data-testid={`comeback-overlay-${date}`}
          data-comeback-day={comebackDayNumber}
          className="pointer-events-none absolute inset-0 rounded-[3px] border-[1.5px] border-dashed border-teal-500"
        />
      )}
      {/* Sabbatical rest day — diagonal stripes */}
      {isSabbatical && !isFuture && (
        <span
          role="img"
          aria-label="Rest Day (Sabbatical)"
          data-testid={`sabbatical-overlay-${date}`}
          className="pointer-events-none absolute inset-0 rounded-[3px] opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #94a3b8 0 1px, transparent 1px 4px)",
          }}
        />
      )}
      {/* Milestone — star marker, top-right */}
      {milestone && (
        <span
          role="img"
          aria-label={`${milestone.days}-Day Streak Milestone`}
          data-testid={`milestone-marker-${date}`}
          className="pointer-events-none absolute -right-1 -top-1 text-[9px] leading-none text-amber-500 drop-shadow-sm"
        >
          ★
        </span>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HeatmapGrid = ({
  data,
  semesterRange,
  studentLevel,
  comebackChallenge,
  sabbaticalEnabled = false,
  milestones,
  onCellClick,
  onCellHover,
}: HeatmapGridProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { slots, numCols, dayCount } = useMemo(
    () => buildGridModel(data, semesterRange),
    [data, semesterRange]
  );

  const monthLabels = useMemo(() => computeMonthLabels(slots), [slots]);

  const trackWidth = numCols * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  // --- Interaction callbacks (stable) ---------------------------------------

  const registerRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(index, el);
    else cellRefs.current.delete(index);
  }, []);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent, index: number) => {
      let next: number | null = null;
      switch (e.key) {
        case "ArrowRight": next = index + WEEKDAY_ROWS; break; // next week, same weekday
        case "ArrowLeft": next = index - WEEKDAY_ROWS; break;
        case "ArrowDown": next = index + 1; break; // next day
        case "ArrowUp": next = index - 1; break;
        case "Home": next = 0; break;
        case "End": next = dayCount - 1; break;
        case "Enter":
        case " ": {
          e.preventDefault();
          const day = findDayByLogicalIndex(slots, index);
          if (day && !day.isFuture) onCellClick?.(day.date);
          return;
        }
        default: return;
      }
      e.preventDefault();
      if (next !== null && next >= 0 && next < dayCount) {
        setFocusedIndex(next);
        cellRefs.current.get(next)?.focus();
      }
    },
    [slots, dayCount, onCellClick]
  );

  const handleFocusCell = useCallback(
    (index: number, date: string, isFuture: boolean) => {
      setFocusedIndex(index);
      if (!isFuture) onCellHover?.(date);
    },
    [onCellHover]
  );

  const handleBlurCell = useCallback(() => onCellHover?.(null), [onCellHover]);
  const handleHover = useCallback(
    (date: string | null) => onCellHover?.(date),
    [onCellHover]
  );
  const handleClick = useCallback(
    (date: string) => onCellClick?.(date),
    [onCellClick]
  );

  const legendLabels = getLegendLabels(studentLevel);

  return (
    <div className="w-full" data-testid="heatmap-root">
      <div className="flex gap-1">
        {/* Sticky weekday label column */}
        <div
          className="shrink-0 select-none"
          style={{ width: WEEKDAY_COL_W, paddingTop: MONTH_ROW_H }}
          aria-hidden="true"
        >
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${WEEKDAY_ROWS}, ${CELL_SIZE}px)`,
              rowGap: CELL_GAP,
            }}
          >
            {Array.from({ length: WEEKDAY_ROWS }).map((_, row) => {
              const label = DAY_LABELS.find((d) => d.row === row)?.label;
              return (
                <div
                  key={row}
                  className="flex items-center text-[10px] leading-none text-muted-foreground"
                  data-testid={label ? `day-label-${label}` : undefined}
                >
                  {label ?? ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable track: month labels + grid */}
        <div
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label="Habit activity heatmap. Scroll horizontally to see earlier and later weeks."
        >
          <div style={{ width: trackWidth, minWidth: "100%" }}>
            {/* Month labels */}
            <div className="relative" style={{ height: MONTH_ROW_H }}>
              {monthLabels.map((ml) => (
                <span
                  key={`month-${ml.month}-${ml.col}`}
                  className="absolute top-0 text-[10px] leading-none text-muted-foreground"
                  style={{ left: ml.col * (CELL_SIZE + CELL_GAP) }}
                  data-testid={`month-label-${ml.month}`}
                >
                  {ml.month}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div
              role="grid"
              aria-label="Habit heatmap grid"
              aria-rowcount={WEEKDAY_ROWS}
              aria-colcount={numCols}
              className="grid w-max"
              style={{
                gridTemplateRows: `repeat(${WEEKDAY_ROWS}, ${CELL_SIZE}px)`,
                gridAutoColumns: `${CELL_SIZE}px`,
                gridAutoFlow: "column",
                gap: CELL_GAP,
              }}
            >
              {slots.map((slot, pos) => {
                if (slot.kind === "pad") {
                  return (
                    <div
                      key={`pad-${pos}`}
                      aria-hidden="true"
                      className="rounded-[3px]"
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    />
                  );
                }

                let intensity: number;
                if (slot.isFuture) {
                  intensity = 0;
                } else if (studentLevel) {
                  const levelOnDate = getLevelForDate(
                    slot.date,
                    studentLevel.levelHistory
                  );
                  intensity = getLevelAwareIntensityLevel(slot.count, levelOnDate);
                } else {
                  intensity = getIntensityLevel(slot.count);
                }

                const isComeback = isComebackChallengeDate(slot.date, comebackChallenge);
                const isSabbatical = isSabbaticalRestDay(slot.date, sabbaticalEnabled);
                const milestone = getMilestoneForDate(slot.date, milestones);
                const comebackDayNumber = isComeback
                  ? comebackDayNumberFor(slot.date, comebackChallenge!)
                  : 0;

                return (
                  <HeatmapCell
                    key={slot.date}
                    slot={slot}
                    intensity={intensity}
                    size={CELL_SIZE}
                    isRovingTarget={
                      focusedIndex === slot.logicalIndex ||
                      (focusedIndex === null && slot.logicalIndex === 0)
                    }
                    isComeback={isComeback}
                    isSabbatical={isSabbatical}
                    milestone={milestone}
                    comebackDayNumber={comebackDayNumber}
                    onKeyDown={handleKeyDown}
                    onFocusCell={handleFocusCell}
                    onBlurCell={handleBlurCell}
                    onHover={handleHover}
                    onClick={handleClick}
                    registerRef={registerRef}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — real HTML flow, cannot overlap (fixes the SVG overlap bug) */}
      <div
        className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 ps-[34px] text-[11px] text-muted-foreground"
        data-testid="heatmap-legend"
      >
        <span data-testid="legend-label-0">{legendLabels[0]}</span>
        <div className="flex items-center gap-1" role="img" aria-label="Activity scale from none to high">
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={`legend-${level}`}
              data-testid={`legend-level-${level}`}
              data-level={level}
              className="h-3 w-3 rounded-[3px] shadow-[inset_0_0_0_1px_var(--heatmap-cell-outline)]"
              style={{ backgroundColor: INTENSITY_COLORS[level] }}
            />
          ))}
        </div>
        <span data-testid="legend-label-4">{legendLabels[4]}</span>
      </div>
    </div>
  );
};

export default memo(HeatmapGrid);
