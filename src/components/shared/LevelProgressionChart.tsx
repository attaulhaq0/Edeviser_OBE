import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { LevelProgressionPoint } from "@/types/habits";

export interface LevelProgressionChartProps {
  data: LevelProgressionPoint[];
  currentLevel: 1 | 2 | 3 | 4;
}

/**
 * Detects level-up points where the level increased from the previous entry.
 */
const getLevelUpMarkers = (
  data: LevelProgressionPoint[]
): LevelProgressionPoint[] => {
  const markers: LevelProgressionPoint[] = [];
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    if (current && previous && current.level > previous.level) {
      markers.push(current);
    }
  }
  return markers;
};

const LevelProgressionChart = ({
  data,
  currentLevel,
}: LevelProgressionChartProps) => {
  const firstPoint = data[0];
  const isSingleLevel =
    data.length <= 1 || data.every((p) => p.level === firstPoint?.level);

  if (isSingleLevel) {
    const level = firstPoint ? firstPoint.level : currentLevel;
    return (
      <div
        className="flex flex-col items-center justify-center py-8 gap-2"
        data-testid="level-progression-single"
      >
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-blue-600">{level}</span>
          <span className="text-sm text-gray-500">/ 4</span>
        </div>
        <p className="text-sm text-gray-600 text-center">
          You've been consistent at Level {level} this semester
        </p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const levelUpMarkers = getLevelUpMarkers(sorted);

  return (
    <div data-testid="level-progression-chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={sorted}
          margin={{ top: 12, right: 12, bottom: 4, left: -20 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v + "T00:00:00");
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis
            domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `Lv ${v}`}
          />
          <Tooltip
            formatter={
              ((value: number | undefined) => [
                `Level ${value ?? 0}`,
                "Level",
              ]) as never
            }
            labelFormatter={(label: unknown) => {
              const d = new Date(String(label) + "T00:00:00");
              return d.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              });
            }}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Line
            type="stepAfter"
            dataKey="level"
            stroke="url(#levelGradient)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#2563eb" }}
          />
          {levelUpMarkers.map((marker) => (
            <ReferenceDot
              key={marker.date}
              x={marker.date}
              y={marker.level}
              r={6}
              fill="#14b8a6"
              stroke="#fff"
              strokeWidth={2}
              data-testid={`level-up-marker-${marker.date}`}
            />
          ))}
          <defs>
            <linearGradient id="levelGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0382BD" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LevelProgressionChart;
