import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CorrelationPayload {
  student_id: string;
}

interface CorrelationInsight {
  id: string;
  habitType: string;
  academicMetric: string;
  description: string;
  strength: number;
}

interface CorrelationInsightWithConfidence extends CorrelationInsight {
  confidenceLevel: "early_pattern" | "emerging_trend" | "strong_pattern";
  dataPointCount: number;
}

interface CorrelationResponse {
  insights: CorrelationInsightWithConfidence[] | CorrelationInsight[];
  insufficient_data: boolean;
  days_until_ready?: number;
  data_point_count?: number;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown
): { valid: true; data: CorrelationPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== "string") {
    return {
      valid: false,
      error: "student_id is required and must be a string",
    };
  }

  return {
    valid: true,
    data: { student_id: p.student_id as string },
  };
}

// ─── Pure Correlation Logic (exported for testing) ──────────────────────────

/**
 * Non-causal description templates for correlation insights.
 * Uses "on days when" / "tends to" language — never "because" / "causes" / "due to".
 */
const INSIGHT_TEMPLATES: Record<string, (habitLabel: string) => string> = {
  submission_rate: (habit) =>
    `On days when you ${habit}, you tend to submit more assignments`,
  submission_timeliness: (habit) =>
    `On days when you ${habit}, you're more likely to submit assignments on time`,
  activity_level: (habit) =>
    `On days when you ${habit}, you tend to be more active on the platform`,
};

const HABIT_LABELS: Record<string, string> = {
  meditation: "meditate",
  hydration: "stay hydrated",
  exercise: "exercise",
  sleep: "get enough sleep",
  login: "log in",
  submit: "submit work",
  journal: "journal",
  read: "read content",
};

/**
 * Computes co-occurrence rate between a habit and an academic event.
 * Returns a value between 0 and 1 representing how much more likely
 * the academic event is on days the habit is performed vs days it isn't.
 */
export function computeCoOccurrenceRate(
  habitDates: Set<string>,
  eventDates: Set<string>,
  allDates: Set<string>
): number {
  if (habitDates.size === 0 || allDates.size === 0) return 0;

  const nonHabitDates = new Set(
    [...allDates].filter((d) => !habitDates.has(d))
  );

  // Rate of event on habit days
  let habitEventCount = 0;
  for (const d of habitDates) {
    if (eventDates.has(d)) habitEventCount++;
  }
  const habitRate = habitDates.size > 0 ? habitEventCount / habitDates.size : 0;

  // Rate of event on non-habit days
  let nonHabitEventCount = 0;
  for (const d of nonHabitDates) {
    if (eventDates.has(d)) nonHabitEventCount++;
  }
  const nonHabitRate =
    nonHabitDates.size > 0 ? nonHabitEventCount / nonHabitDates.size : 0;

  // Strength: difference in rates, normalized to 0-1
  // If habit rate is higher than non-habit rate, there's a positive correlation
  if (habitRate <= nonHabitRate) return 0;

  // Normalize: max possible difference is 1 (100% vs 0%)
  return Math.min(habitRate - nonHabitRate, 1);
}

/**
 * Generates insight description using non-causal language.
 * Never uses "because", "causes", "due to", "results in", "leads to".
 */
export function generateInsightDescription(
  habitType: string,
  academicMetric: string
): string {
  const habitLabel = HABIT_LABELS[habitType] ?? habitType;
  const template = INSIGHT_TEMPLATES[academicMetric];
  if (template) return template(habitLabel);
  return `On days when you ${habitLabel}, your ${academicMetric.replace(
    /_/g,
    " "
  )} tends to be higher`;
}

/**
 * Checks if the data meets the 14-day minimum threshold.
 */
export function hasMinimumData(
  allDates: Set<string>,
  minimumDays: number = 14
): boolean {
  return allDates.size >= minimumDays;
}

/**
 * Computes correlation insights from raw data.
 * Returns up to 3 insights sorted by strength (descending).
 */
export function computeCorrelationInsights(
  habitDatesByType: Map<string, Set<string>>,
  submissionDates: Set<string>,
  allDates: Set<string>
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  for (const [habitType, habitDates] of habitDatesByType) {
    // Compute co-occurrence with submission rate
    const strength = computeCoOccurrenceRate(
      habitDates,
      submissionDates,
      allDates
    );

    if (strength > 0.05) {
      insights.push({
        id: `${habitType}_submission_rate`,
        habitType,
        academicMetric: "submission_rate",
        description: generateInsightDescription(habitType, "submission_rate"),
        strength: Math.round(strength * 100) / 100,
      });
    }
  }

  // Sort by strength descending, return top 3
  return insights.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

// ─── Confidence Level Mapping ────────────────────────────────────────────────

/**
 * Maps data point count to a confidence level.
 * Returns null for counts below the 30-day minimum threshold.
 */
export function getConfidenceLevel(
  dataPointCount: number
): "early_pattern" | "emerging_trend" | "strong_pattern" | null {
  if (dataPointCount < 30) return null;
  if (dataPointCount < 60) return "early_pattern";
  if (dataPointCount < 90) return "emerging_trend";
  return "strong_pattern";
}

// ─── Forbidden causal words validation ──────────────────────────────────────

const FORBIDDEN_CAUSAL_WORDS = [
  "because",
  "causes",
  "caused",
  "due to",
  "results in",
  "leads to",
];

export function containsCausalLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_CAUSAL_WORDS.some((word) => lower.includes(word));
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require authenticated user (student or service call) ───
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey;

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user: caller },
        error: authError,
      } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { student_id } = validation.data;

    // ── Step 1: Determine semester range ─────────────────────────────────

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let semesterStart = `${now.getFullYear()}-01-01`;
    let semesterEnd = `${now.getFullYear()}-12-31`;

    const { data: semester } = await supabase
      .from("semesters")
      .select("start_date, end_date")
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .maybeSingle();

    if (semester) {
      semesterStart = semester.start_date;
      semesterEnd = semester.end_date;
    }

    // ── Step 2: Fetch habit_logs (academic habits) ──────────────────────

    const { data: habitLogs, error: habitErr } = await supabase
      .from("habit_logs")
      .select("date, habit_type")
      .eq("student_id", student_id)
      .gte("date", semesterStart)
      .lte("date", semesterEnd);

    if (habitErr) {
      console.error("Failed to fetch habit_logs:", habitErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch habit data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 3: Fetch wellness_habit_logs ────────────────────────────────

    const { data: wellnessLogs, error: wellnessErr } = await supabase
      .from("wellness_habit_logs")
      .select("date, wellness_type")
      .eq("student_id", student_id)
      .gte("date", semesterStart)
      .lte("date", semesterEnd);

    if (wellnessErr) {
      console.error(
        "Failed to fetch wellness_habit_logs:",
        wellnessErr.message
      );
      return new Response(
        JSON.stringify({ error: "Failed to fetch wellness data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 4: Fetch submissions ───────────────────────────────────────

    const { data: submissions, error: subErr } = await supabase
      .from("submissions")
      .select("submitted_at")
      .eq("student_id", student_id)
      .gte("submitted_at", `${semesterStart}T00:00:00Z`)
      .lte("submitted_at", `${semesterEnd}T23:59:59Z`);

    if (subErr) {
      console.error("Failed to fetch submissions:", subErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch submission data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 5: Build date sets ─────────────────────────────────────────

    const allDates = new Set<string>();
    const habitDatesByType = new Map<string, Set<string>>();

    // Academic habits
    for (const log of habitLogs ?? []) {
      const date = log.date as string;
      const type = log.habit_type as string;
      allDates.add(date);
      if (!habitDatesByType.has(type)) habitDatesByType.set(type, new Set());
      habitDatesByType.get(type)!.add(date);
    }

    // Wellness habits
    for (const log of wellnessLogs ?? []) {
      const date = log.date as string;
      const type = log.wellness_type as string;
      allDates.add(date);
      if (!habitDatesByType.has(type)) habitDatesByType.set(type, new Set());
      habitDatesByType.get(type)!.add(date);
    }

    // Submission dates
    const submissionDates = new Set<string>();
    for (const sub of submissions ?? []) {
      const date = (sub.submitted_at as string).slice(0, 10);
      submissionDates.add(date);
      allDates.add(date);
    }

    // ── Step 6: Check minimum data threshold ───────────────────────────

    const dayCount = allDates.size;

    // Under 14 days: insufficient data, no countdown
    if (dayCount < 14) {
      return new Response(
        JSON.stringify({
          insights: [],
          insufficient_data: true,
          data_point_count: dayCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 14-29 days: insufficient data, show countdown to 30
    if (dayCount < 30) {
      return new Response(
        JSON.stringify({
          insights: [],
          insufficient_data: true,
          days_until_ready: 30 - dayCount,
          data_point_count: dayCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 7: Compute correlations (30+ days) ─────────────────────────

    const insights = computeCorrelationInsights(
      habitDatesByType,
      submissionDates,
      allDates
    );

    const confidenceLevel = getConfidenceLevel(dayCount);

    const insightsWithConfidence: CorrelationInsightWithConfidence[] =
      insights.map((insight) => ({
        ...insight,
        confidenceLevel: confidenceLevel!,
        dataPointCount: dayCount,
      }));

    const response: CorrelationResponse = {
      insights: insightsWithConfidence,
      insufficient_data: false,
      data_point_count: dayCount,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
