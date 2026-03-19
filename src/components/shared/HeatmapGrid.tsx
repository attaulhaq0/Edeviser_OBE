import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { HeatmapDay, DateRange } from '@/types/habits';
import {
  getIntensityLevel,
  computeCellSize,
  generateMonthLabels,
  generateGridDimensions,
  isDateFuture,
  generateAriaLabel,
} from '@/lib/heatmapUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_GAP = 2;
const DAY_LABEL_WIDTH = 32;
const MONTH_LABEL_HEIGHT = 16;
const LEGEND_HEIGHT = 28;
const MIN_CELL_SIZE = 12;
const MOBILE_BREAKPOINT = 768;

const DAY_LABELS: Array<{ label: string; row: number }> = [
  { label: 'Mon', row: 0 },
  { label: 'Wed', row: 2 },
  { label: 'Fri', row: 4 },
];

const INTENSITY_COLORS: Record<number, string> = {
  0: 'var(--heatmap-empty)',
  1: 'var(--heatmap-level-1)',
  2: 'var(--heatmap-level-2)',
  3: 'var(--heatmap-level-3)',
  4: 'var(--heatmap-level-4)',
};

const LEGEND_LABELS = ['No activity', '', '', '', '4+ habits'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HeatmapGridProps {
  data: HeatmapDay[];
  semesterRange: DateRange;
  onCellClick?: (date: string) => void;
  onCellHover?: (date: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CellData {
  date: string;
  count: number;
  col: number;
  row: number;
  isFuture: boolean;
}


function buildCellGrid(
  data: HeatmapDay[],
  semesterRange: DateRange,
): CellData[] {
  const start = new Date(semesterRange.start + 'T00:00:00');
  const end = new Date(semesterRange.end + 'T00:00:00');
  const dataMap = new Map<string, number>();
  for (const d of data) {
    dataMap.set(d.date, d.totalCount);
  }

  const cells: CellData[] = [];
  const cursor = new Date(start);
  let dayIndex = 0;

  while (cursor <= end) {
    const dateStr =
      cursor.getFullYear() +
      '-' +
      String(cursor.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(cursor.getDate()).padStart(2, '0');
    const col = Math.floor(dayIndex / 7);
    const row = dayIndex % 7;
    cells.push({
      date: dateStr,
      count: dataMap.get(dateStr) ?? 0,
      col,
      row,
      isFuture: isDateFuture(dateStr),
    });
    cursor.setDate(cursor.getDate() + 1);
    dayIndex++;
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HeatmapGrid = ({
  data,
  semesterRange,
  onCellClick,
  onCellHover,
}: HeatmapGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cellRefs = useRef<Map<number, SVGRectElement>>(new Map());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Listen for prefers-reduced-motion changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { columns: numWeeks } = generateGridDimensions(
    semesterRange.start,
    semesterRange.end,
  );

  const isMobile = containerWidth > 0 && containerWidth < MOBILE_BREAKPOINT;
  const cellSize = isMobile
    ? MIN_CELL_SIZE
    : containerWidth > 0
      ? computeCellSize(
          containerWidth - DAY_LABEL_WIDTH - CELL_GAP,
          numWeeks,
        )
      : MIN_CELL_SIZE;

  const cells = useMemo(
    () => buildCellGrid(data, semesterRange),
    [data, semesterRange],
  );

  const monthLabels = useMemo(
    () => generateMonthLabels(semesterRange.start, semesterRange.end),
    [semesterRange.start, semesterRange.end],
  );

  const gridWidth = numWeeks * (cellSize + CELL_GAP);
  const gridHeight = 7 * (cellSize + CELL_GAP);
  const svgWidth = DAY_LABEL_WIDTH + gridWidth;
  const svgHeight = MONTH_LABEL_HEIGHT + gridHeight + LEGEND_HEIGHT + 8;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const cell = cells[index];
      if (!cell) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = index + 7;
          break;
        case 'ArrowLeft':
          nextIndex = index - 7;
          break;
        case 'ArrowDown':
          nextIndex = index + 1;
          break;
        case 'ArrowUp':
          nextIndex = index - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!cell.isFuture) {
            onCellClick?.(cell.date);
          }
          return;
        default:
          return;
      }

      e.preventDefault();
      if (nextIndex !== null && nextIndex >= 0 && nextIndex < cells.length) {
        setFocusedIndex(nextIndex);
        cellRefs.current.get(nextIndex)?.focus();
      }
    },
    [cells, onCellClick],
  );

  const setCellRef = useCallback(
    (index: number, el: SVGRectElement | null) => {
      if (el) {
        cellRefs.current.set(index, el);
      } else {
        cellRefs.current.delete(index);
      }
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className={isMobile ? 'overflow-x-auto' : ''}
      style={
        {
          '--heatmap-empty': '#e2e8f0',
          '--heatmap-level-1': '#fed7aa',
          '--heatmap-level-2': '#fdba74',
          '--heatmap-level-3': '#f97316',
          '--heatmap-level-4': '#ef4444',
        } as React.CSSProperties
      }
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        role="grid"
        aria-label="Habit heatmap grid"
      >
        {/* Month labels */}
        {monthLabels.map((ml) => (
          <text
            key={`month-${ml.month}-${ml.weekIndex}`}
            x={DAY_LABEL_WIDTH + ml.weekIndex * (cellSize + CELL_GAP)}
            y={MONTH_LABEL_HEIGHT - 4}
            fontSize={10}
            fill="#64748b"
            data-testid={`month-label-${ml.month}`}
          >
            {ml.month}
          </text>
        ))}

        {/* Day-of-week labels */}
        {DAY_LABELS.map(({ label, row }) => (
          <text
            key={`day-${label}`}
            x={0}
            y={MONTH_LABEL_HEIGHT + row * (cellSize + CELL_GAP) + cellSize / 2 + 4}
            fontSize={10}
            fill="#64748b"
            data-testid={`day-label-${label}`}
          >
            {label}
          </text>
        ))}

        {/* Grid cells */}
        {cells.map((cell, index) => {
          const intensity = cell.isFuture ? 0 : getIntensityLevel(cell.count);
          const color = INTENSITY_COLORS[intensity] ?? INTENSITY_COLORS[0];
          const x = DAY_LABEL_WIDTH + cell.col * (cellSize + CELL_GAP);
          const y = MONTH_LABEL_HEIGHT + cell.row * (cellSize + CELL_GAP);
          const isFocused = focusedIndex === index;

          return (
            <rect
              key={cell.date}
              ref={(el) => setCellRef(index, el)}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              ry={2}
              fill={color}
              opacity={cell.isFuture ? 0.4 : 1}
              aria-label={generateAriaLabel(cell.date, cell.count)}
              aria-disabled={cell.isFuture}
              role="gridcell"
              tabIndex={isFocused || (focusedIndex === null && index === 0) ? 0 : -1}
              data-date={cell.date}
              data-testid={`heatmap-cell-${cell.date}`}
              style={
                !prefersReducedMotion
                  ? { transition: 'fill 0.15s ease, opacity 0.15s ease' }
                  : undefined
              }
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => {
                setFocusedIndex(index);
                if (!cell.isFuture) onCellHover?.(cell.date);
              }}
              onBlur={() => onCellHover?.(null)}
              onMouseEnter={() => {
                if (!cell.isFuture) onCellHover?.(cell.date);
              }}
              onMouseLeave={() => onCellHover?.(null)}
              onClick={() => {
                if (!cell.isFuture) onCellClick?.(cell.date);
              }}
            />
          );
        })}

        {/* Color legend */}
        {[0, 1, 2, 3, 4].map((level, i) => {
          const legendCellSize = 12;
          const legendGap = 4;
          const legendY = MONTH_LABEL_HEIGHT + gridHeight + 8;
          const legendX = DAY_LABEL_WIDTH + i * (legendCellSize + legendGap);
          return (
            <g key={`legend-${level}`}>
              <rect
                x={legendX}
                y={legendY}
                width={legendCellSize}
                height={legendCellSize}
                rx={2}
                ry={2}
                fill={INTENSITY_COLORS[level]}
                data-testid={`legend-level-${level}`}
              />
              {LEGEND_LABELS[i] && (
                <text
                  x={legendX + legendCellSize + 4}
                  y={legendY + legendCellSize - 2}
                  fontSize={9}
                  fill="#64748b"
                  data-testid={`legend-label-${level}`}
                >
                  {LEGEND_LABELS[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default HeatmapGrid;
