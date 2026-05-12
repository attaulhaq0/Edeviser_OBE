import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  GitCompareArrows,
  Users,
  Target,
  BarChart3,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuizCLOCorrelation } from "@/hooks/useQuizCLOCorrelation";
import { useCLOs } from "@/hooks/useCLOs";
import { detectCLODiscrepancy } from "@/lib/questionAnalytics";
import {
  InlineNoCorrelationData,
  InlineNoBloomsData,
} from "@/components/shared/EmptyState";

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: "Remember",
  2: "Understand",
  3: "Apply",
  4: "Analyze",
  5: "Evaluate",
  6: "Create",
};

const BLOOM_CHART_COLORS: Record<number, string> = {
  1: "#a855f7", // purple-500
  2: "#3b82f6", // blue-500
  3: "#22c55e", // green-500
  4: "#eab308", // yellow-500
  5: "#f97316", // orange-500
  6: "#ef4444", // red-500
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CLOComparisonRow {
  cloId: string;
  cloName: string;
  quizScore: number;
  attainment: number;
  hasDiscrepancy: boolean;
}

interface BloomsDistributionRow {
  level: number;
  label: string;
  count: number;
  color: string;
}

// ─── Page Component ─────────────────────────────────────────────────────────

const QuizCLOCorrelationPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { data, isLoading } = useQuizCLOCorrelation(quizId ?? "");
  const closQuery = useCLOs();
  const closData = closQuery.data?.data;

  // Build a CLO id → title lookup
  const cloTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const clo of closData ?? []) {
      map[clo.id] = clo.title;
    }
    return map;
  }, [closData]);

  // Compute per-CLO comparison data
  const {
    comparisonData,
    bloomsData,
    totalStudents,
    avgQuizScore,
    discrepancyCount,
  } = useMemo(() => {
    if (!data) {
      return {
        comparisonData: [] as CLOComparisonRow[],
        bloomsData: [] as BloomsDistributionRow[],
        totalStudents: 0,
        avgQuizScore: 0,
        discrepancyCount: 0,
      };
    }

    const { attempts, attainments } = data;

    // Unique students
    const studentIds = [...new Set(attempts.map((a) => a.student_id))];
    const totalStudents = studentIds.length;

    // Average quiz score across all attempts
    const scores = attempts
      .map((a) => a.score)
      .filter((s): s is number => s !== null);
    const avgQuizScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

    // Per-CLO attainment averages from outcome_attainment
    const attainmentByCLO: Record<string, number[]> = {};
    for (const att of attainments) {
      const key = att.outcome_id;
      if (!attainmentByCLO[key]) {
        attainmentByCLO[key] = [];
      }
      attainmentByCLO[key]!.push(att.attainment_percent);
    }

    // Per-CLO quiz score: derive from question_sequence CLO mapping
    // Since question_sequence is raw JSON, we use a simplified approach:
    // group attempts by CLO from the attainment data and use the overall quiz score
    // as a proxy per CLO (the hook returns raw data, full CLO-level scoring
    // would require question-level answer data which isn't in the hook response)
    const cloIds = Object.keys(attainmentByCLO);

    const comparisonData: CLOComparisonRow[] = cloIds.map((cloId) => {
      const attainmentValues = attainmentByCLO[cloId] ?? [];
      const avgAttainment =
        attainmentValues.length > 0
          ? attainmentValues.reduce((sum, v) => sum + v, 0) /
            attainmentValues.length
          : 0;

      // Use overall quiz score as proxy for per-CLO quiz score
      const quizScore = avgQuizScore;
      const hasDiscrepancy = detectCLODiscrepancy(quizScore, avgAttainment);

      return {
        cloId,
        cloName: cloTitleMap[cloId] ?? cloId.slice(0, 8),
        quizScore: Math.round(quizScore * 10) / 10,
        attainment: Math.round(avgAttainment * 10) / 10,
        hasDiscrepancy,
      };
    });

    const discrepancyCount = comparisonData.filter(
      (r) => r.hasDiscrepancy
    ).length;

    // Bloom's distribution: count questions per Bloom's level from question_sequence
    const bloomCounts: Record<number, number> = {};
    for (const attempt of attempts) {
      const seq = attempt.question_sequence;
      if (Array.isArray(seq)) {
        for (const item of seq) {
          const bl =
            typeof item === "object" && item !== null && "bloom_level" in item
              ? (item as { bloom_level: number }).bloom_level
              : null;
          if (bl && bl >= 1 && bl <= 6) {
            bloomCounts[bl] = (bloomCounts[bl] ?? 0) + 1;
          }
        }
      }
    }

    const bloomsData: BloomsDistributionRow[] = [1, 2, 3, 4, 5, 6].map(
      (level) => ({
        level,
        label: BLOOM_LABELS[level] ?? `Level ${level}`,
        count: bloomCounts[level] ?? 0,
        color: BLOOM_CHART_COLORS[level] ?? "#6b7280",
      })
    );

    return {
      comparisonData,
      bloomsData,
      totalStudents,
      avgQuizScore,
      discrepancyCount,
    };
  }, [data, cloTitleMap]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Quiz-CLO Correlation
          </h1>
        </div>
        <div className="animate-shimmer h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <GitCompareArrows className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">
          Quiz-CLO Correlation
        </h1>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Total Students
              </p>
              <p className="text-2xl font-black mt-1">{totalStudents}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Avg Quiz Score
              </p>
              <p className="text-2xl font-black mt-1">
                {avgQuizScore.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-teal-50 group-hover:scale-110 transition-transform">
              <Target className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                CLO Discrepancies
              </p>
              <p className="text-2xl font-black mt-1">{discrepancyCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Per-CLO Comparison Chart */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Per-CLO: Quiz Score vs Attainment
          </h2>
        </div>
        <div className="p-6">
          {comparisonData.length === 0 ? (
            <InlineNoCorrelationData />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={comparisonData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="cloName"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    formatter={(value) => {
                      const n = Array.isArray(value)
                        ? Number(value[0] ?? 0)
                        : Number(value ?? 0);
                      return `${n.toFixed(1)}%`;
                    }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="quizScore"
                    name="Quiz Score"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="attainment"
                    name="CLO Attainment"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Discrepancy badges */}
              {comparisonData.some((r) => r.hasDiscrepancy) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {comparisonData
                    .filter((r) => r.hasDiscrepancy)
                    .map((r) => (
                      <Badge
                        key={r.cloId}
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold"
                      >
                        <AlertTriangle className="h-3 w-3 me-1" />
                        {r.cloName}:{" "}
                        {Math.abs(r.quizScore - r.attainment).toFixed(1)}pp gap
                      </Badge>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Bloom's Distribution Chart */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Bloom&apos;s Level Distribution
          </h2>
        </div>
        <div className="p-6">
          {bloomsData.every((b) => b.count === 0) ? (
            <InlineNoBloomsData />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={bloomsData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" name="Questions" radius={[4, 4, 0, 0]}>
                  {bloomsData.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default QuizCLOCorrelationPage;
