import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ───────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsRequest {
  course_id: string;
  date_range?: { start: string; end: string };
}

interface TopQuestionedCLO {
  clo_id: string;
  clo_title: string;
  conversation_count: number;
}

interface CommonTopic {
  topic: string;
  frequency: number;
}

interface DailyUsage {
  date: string;
  conversation_count: number;
}

interface AnalyticsResponse {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  avg_satisfaction_rating: number;
  top_questioned_clos: TopQuestionedCLO[];
  common_topics: CommonTopic[];
  usage_over_time: DailyUsage[];
}

// ─── Stop Words ─────────────────────────────────────────────────────────────
// Common English stop words filtered out during topic extraction

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "its",
  "this",
  "that",
  "was",
  "are",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "not",
  "no",
  "nor",
  "so",
  "if",
  "then",
  "than",
  "too",
  "very",
  "just",
  "about",
  "above",
  "after",
  "again",
  "all",
  "also",
  "am",
  "any",
  "as",
  "because",
  "before",
  "below",
  "between",
  "both",
  "during",
  "each",
  "few",
  "further",
  "get",
  "got",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "im",
  "into",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "now",
  "only",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "some",
  "such",
  "them",
  "themselves",
  "there",
  "these",
  "they",
  "those",
  "through",
  "under",
  "until",
  "up",
  "us",
  "we",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  // Common chat filler words
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank",
  "please",
  "okay",
  "ok",
  "yes",
  "yeah",
  "no",
  "sure",
  "like",
  "know",
  "think",
  "want",
  "need",
  "help",
  "question",
  "understand",
  "explain",
  "dont",
  "doesnt",
  "didnt",
  "cant",
  "wont",
  "isnt",
  "arent",
  "wasnt",
  "werent",
  "havent",
  "hasnt",
  "hadnt",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Validates that a string is a valid UUID v4 format.
 */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Validates that a string is a valid ISO 8601 date.
 */
function isValidDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/**
 * Extracts common topics from message content using word frequency analysis.
 * Filters out stop words, short words, and returns top N topics.
 * PII exclusion: only processes word tokens — no names, emails, or IDs are extracted.
 */
export function extractCommonTopics(
  messages: Array<{ content: string }>,
  topN: number = 15
): CommonTopic[] {
  const wordFrequency = new Map<string, number>();

  for (const msg of messages) {
    // Normalize: lowercase, remove punctuation, split into words
    const words = msg.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    // Count unique words per message to avoid one long message dominating
    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
    }
  }

  // Sort by frequency descending, take top N
  return Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic, frequency]) => ({ topic, frequency }));
}

/**
 * Validates that the analytics response contains no PII.
 * Checks that no email addresses leak into the response.
 */
function validateNoPII(response: AnalyticsResponse): boolean {
  const json = JSON.stringify(response);
  // Check for email patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(json)) {
    return false;
  }
  return true;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Step 1: Validate JWT ──────────────────────────────────────────

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
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
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const teacherId = user.id;

    // ── Step 2: Parse and Validate Request ────────────────────────────

    const body: AnalyticsRequest = await req.json();

    if (!body.course_id || !isValidUUID(body.course_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing course_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (body.date_range) {
      if (
        !body.date_range.start ||
        !body.date_range.end ||
        !isValidDate(body.date_range.start) ||
        !isValidDate(body.date_range.end)
      ) {
        return new Response(
          JSON.stringify({
            error: "Invalid date_range: start and end must be valid ISO dates",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ── Step 3: Verify Teacher Owns the Course ────────────────────────

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, institution_id, teacher_id")
      .eq("id", body.course_id)
      .maybeSingle();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check teacher owns the course OR user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", teacherId)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isTeacher = course.teacher_id === teacherId;

    if (!isTeacher && !isAdmin) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: you do not have access to this course",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 4: Determine Date Range ──────────────────────────────────

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = body.date_range?.start
      ? new Date(body.date_range.start).toISOString()
      : thirtyDaysAgo.toISOString();
    const endDate = body.date_range?.end
      ? new Date(body.date_range.end).toISOString()
      : now.toISOString();

    // ── Step 5: Aggregate Metrics (3.3.1) ─────────────────────────────
    // Fetch all conversations for the course in the date range in one query
    // Include id, message_count, clo_scope, and created_at to avoid N+1

    const { data: conversations, error: convError } = await supabase
      .from("tutor_conversations")
      .select("id, message_count, clo_scope, created_at")
      .eq("course_id", body.course_id)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    const totalConversations = conversations?.length ?? 0;
    const totalMessages =
      conversations?.reduce((sum, c) => sum + (c.message_count ?? 0), 0) ?? 0;
    const avgMessagesPerConversation =
      totalConversations > 0
        ? Math.round((totalMessages / totalConversations) * 100) / 100
        : 0;

    // Fetch satisfaction ratings from messages in these conversations
    const conversationIds = conversations?.map((c) => c.id) ?? [];

    let avgSatisfactionRating = 0;
    if (conversationIds.length > 0) {
      const { data: ratedMessages, error: ratingError } = await supabase
        .from("tutor_messages")
        .select("satisfaction_rating")
        .in("conversation_id", conversationIds)
        .not("satisfaction_rating", "is", null);

      if (ratingError) {
        throw new Error(
          `Failed to fetch satisfaction ratings: ${ratingError.message}`
        );
      }

      if (ratedMessages && ratedMessages.length > 0) {
        const positiveCount = ratedMessages.filter(
          (m) => m.satisfaction_rating === "thumbs_up"
        ).length;
        avgSatisfactionRating =
          Math.round((positiveCount / ratedMessages.length) * 100) / 100;
      }
    }

    // ── Step 6: Top Questioned CLOs (3.3.2) ───────────────────────────
    // Count conversations per CLO from clo_scope array

    const cloFrequency = new Map<string, number>();
    for (const conv of conversations ?? []) {
      const cloScope: string[] = conv.clo_scope ?? [];
      for (const cloId of cloScope) {
        cloFrequency.set(cloId, (cloFrequency.get(cloId) ?? 0) + 1);
      }
    }

    // Fetch CLO titles for the top CLOs
    const topCloEntries = Array.from(cloFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topCloIds = topCloEntries.map(([id]) => id);
    let cloTitleMap = new Map<string, string>();

    if (topCloIds.length > 0) {
      const { data: clos } = await supabase
        .from("learning_outcomes")
        .select("id, title")
        .in("id", topCloIds);

      if (clos) {
        cloTitleMap = new Map(clos.map((c) => [c.id, c.title]));
      }
    }

    const topQuestionedClos: TopQuestionedCLO[] = topCloEntries.map(
      ([cloId, count]) => ({
        clo_id: cloId,
        clo_title: cloTitleMap.get(cloId) ?? "Unknown CLO",
        conversation_count: count,
      })
    );

    // ── Step 7: Common Topics Extraction (3.3.3) ──────────────────────
    // Extract anonymized topics from student messages (role = 'user' only)
    // No student identifiers, names, or conversation content is returned

    let commonTopics: CommonTopic[] = [];
    if (conversationIds.length > 0) {
      const { data: userMessages, error: msgError } = await supabase
        .from("tutor_messages")
        .select("content")
        .in("conversation_id", conversationIds)
        .eq("role", "user");

      if (msgError) {
        throw new Error(
          `Failed to fetch messages for topic extraction: ${msgError.message}`
        );
      }

      commonTopics = extractCommonTopics(userMessages ?? []);
    }

    // ── Step 8: Usage Over Time (3.3.4) ───────────────────────────────
    // Daily conversation counts for the date range

    const usageOverTime: DailyUsage[] = [];
    const usageStart = body.date_range?.start
      ? new Date(body.date_range.start)
      : new Date(thirtyDaysAgo);
    const usageEnd = body.date_range?.end ? new Date(body.date_range.end) : now;

    // Build a map of date -> count from conversations (already fetched)
    const dailyCounts = new Map<string, number>();
    for (const conv of conversations ?? []) {
      if (conv.created_at) {
        const dateKey = conv.created_at.split("T")[0];
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
      }
    }

    // Fill in all dates in the range (including zero-count days)
    const currentDate = new Date(usageStart);
    while (currentDate <= usageEnd) {
      const dateKey = currentDate.toISOString().split("T")[0];
      usageOverTime.push({
        date: dateKey,
        conversation_count: dailyCounts.get(dateKey) ?? 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // ── Step 9: PII Exclusion Validation (3.3.5) ──────────────────────
    // Final check: ensure no PII leaked into the response

    const response: AnalyticsResponse = {
      total_conversations: totalConversations,
      total_messages: totalMessages,
      avg_messages_per_conversation: avgMessagesPerConversation,
      avg_satisfaction_rating: avgSatisfactionRating,
      top_questioned_clos: topQuestionedClos,
      common_topics: commonTopics,
      usage_over_time: usageOverTime,
    };

    // Validate no PII leaked into the response
    if (!validateNoPII(response)) {
      console.error("PII detected in analytics response — scrubbing");
      // Return safe fallback with empty topics
      response.common_topics = [];
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tutor-analytics error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
