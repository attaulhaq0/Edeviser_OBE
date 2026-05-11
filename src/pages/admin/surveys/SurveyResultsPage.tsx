import { useMemo, useState } from "react";
import { BarChart3, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  useSurveys,
  useSurveyQuestions,
  useSurveyResponses,
} from "@/hooks/useSurveys";
import type { SurveyQuestion, SurveyResponse } from "@/hooks/useSurveys";
import {
  aggregateLikert,
  aggregateMCQ,
  LIKERT_LABELS,
} from "@/lib/surveyAggregators";

// ─── Constants ──────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// ─── Question Result Card ───────────────────────────────────────────────────

interface QuestionResultProps {
  question: SurveyQuestion;
  responses: SurveyResponse[];
  index: number;
}

const QuestionResult = ({
  question,
  responses,
  index,
}: QuestionResultProps) => {
  const questionResponses = responses.filter(
    (r) => r.question_id === question.id
  );
  const totalResponses = questionResponses.length;

  if (question.question_type === "likert") {
    const data = aggregateLikert(responses, question.id);
    const avg =
      totalResponses > 0
        ? questionResponses.reduce((sum, r) => {
            const idx = (LIKERT_LABELS as readonly string[]).indexOf(
              r.response_value
            );
            return sum + (idx >= 0 ? idx + 1 : 0);
          }, 0) / totalResponses
        : 0;

    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium">
            Q{index + 1}. {question.question_text}
          </p>
          <Badge variant="secondary" className="text-xs shrink-0 ms-2">
            Avg: {avg.toFixed(1)}/5
          </Badge>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500">
          {totalResponses} response{totalResponses !== 1 ? "s" : ""}
        </p>
      </Card>
    );
  }

  if (question.question_type === "mcq") {
    const data = aggregateMCQ(responses, question.id);

    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium">
          Q{index + 1}. {question.question_text}
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="option"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, value }: { name?: string; value?: number }) =>
                  `${name ?? ""} (${value ?? 0})`
                }
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500">
          {totalResponses} response{totalResponses !== 1 ? "s" : ""}
        </p>
      </Card>
    );
  }

  // Text responses
  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">
        Q{index + 1}. {question.question_text}
      </p>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {questionResponses.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No responses yet</p>
        ) : (
          questionResponses.map((r) => (
            <div
              key={r.id}
              className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-gray-700"
            >
              {r.response_value}
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-gray-500">
        {totalResponses} response{totalResponses !== 1 ? "s" : ""}
      </p>
    </Card>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const SurveyResultsPage = () => {
  const { data: surveys, isLoading: surveysLoading } = useSurveys();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");

  const { data: questions } = useSurveyQuestions(selectedSurveyId || undefined);
  const { data: responses } = useSurveyResponses(selectedSurveyId || undefined);

  const uniqueRespondents = useMemo(() => {
    if (!responses) return 0;
    return new Set(responses.map((r) => r.respondent_id)).size;
  }, [responses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Survey Results</h1>
      </div>

      <div className="max-w-sm">
        <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a survey..." />
          </SelectTrigger>
          <SelectContent>
            {(surveys ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {surveysLoading ? (
        <div className="h-32 rounded-xl animate-shimmer" />
      ) : !selectedSurveyId ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a survey to view results.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Total Responses
              </p>
              <p className="text-2xl font-black mt-1">
                {responses?.length ?? 0}
              </p>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Respondents
              </p>
              <p className="text-2xl font-black mt-1">{uniqueRespondents}</p>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Questions
              </p>
              <p className="text-2xl font-black mt-1">
                {questions?.length ?? 0}
              </p>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Completion Rate
              </p>
              <p className="text-2xl font-black mt-1">
                {questions?.length && uniqueRespondents
                  ? `${Math.min(
                      100,
                      Math.round(
                        ((responses?.length ?? 0) /
                          (questions.length * uniqueRespondents)) *
                          100
                      )
                    )}%`
                  : "—"}
              </p>
            </Card>
          </div>

          {/* Per-question results */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <ClipboardList className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Question Breakdown
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {(questions ?? []).map((q, i) => (
                <QuestionResult
                  key={q.id}
                  question={q}
                  responses={responses ?? []}
                  index={i}
                />
              ))}
              {!questions?.length && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No questions found for this survey.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default SurveyResultsPage;
