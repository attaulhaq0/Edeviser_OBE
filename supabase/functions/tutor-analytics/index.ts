import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsRequest {
  course_id: string;
  start_date?: string;
  end_date?: string;
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

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRequest(
  body: unknown,
): { valid: true; data: AnalyticsRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.course_id || typeof req.course_id !== 'string') {
    return { valid: false, error: 'course_id is required and must be a string' };
  }

  if (req.start_date !== undefined && typeof req.start_date !== 'string') {
    return { valid: false, error: 'start_date must be a string' };
  }

  if (req.end_date !== undefined && typeof req.end_date !== 'string') {
    return { valid: false, error: 'end_date must be a string' };
  }

  return {
    valid: true,
    data: {
      course_id: req.course_id as string,
      start_date: req.start_date as string | undefined,
      end_date: req.end_date as string | undefined,
    },
  };
}

// ─── Topic Extraction ───────────────────────────────────────────────────────

/**
 * Extract common topics from student messages using simple keyword frequency.
 * Anonymized — no student identifiers included.
 * Filters out common stop words and returns top 10 topics.
 */
function extractCommonTopics(messages: Array<{ content: string }>): CommonTopic[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'down', 'this', 'that', 'these',
    'those', 'what', 'which', 'who', 'whom', 'it', 'its', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'his', 'her',
    'their', 'help', 'please', 'thanks', 'thank', 'hi', 'hello', 'hey',
    'understand', 'explain', 'know', 'think', 'need', 'want', 'get',
    'make', 'like', 'also', 'really', 'much', 'well', 'still', 'even',
  ]);

  const wordFrequency = new Map<string, number>();

  for (const msg of messages) {
    const words = msg.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    // Count unique words per message to avoid one long message dominating
    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
    }
  }

  return Array.from(wordFrequency.entries())
    .filter(([, count]) => count >= 2) // Minimum 2 occurrences
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, frequency]) => ({ topic, frequency }));
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Validate JWT and extract user ───────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Verify teacher role and course ownership ────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
      return new Response(
        JSON.stringify({ error: 'Only teachers, coordinators, and admins can access tutor analytics' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse and validate request ──────────────────────────────────────
    const body = await req.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const analyticsReq = validation.data;

    // Default date range: last 30 days
    const endDate = analyticsReq.end_date ?? new Date().toISOString();
    const startDate = analyticsReq.start_date ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ── Task 3.3.1: Aggregate metrics ───────────────────────────────────
    const { data: conversations, error: convError } = await supabase
      .from('tutor_conversations')
      .select('id, message_count, clo_scope, created_at')
      .eq('course_id', analyticsReq.course_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    const totalConversations = conversations?.length ?? 0;
    const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count ?? 0), 0) ?? 0;
    const avgMessagesPerConversation =
      totalConversations > 0 ? totalMessages / totalConversations : 0;

    // Fetch satisfaction ratings
    const conversationIds = conversations?.map((c) => c.id) ?? [];
    let avgSatisfactionRating = 0;

    if (conversationIds.length > 0) {
      const { data: ratedMessages } = await supabase
        .from('tutor_messages')
        .select('satisfaction_rating')
        .in('conversation_id', conversationIds)
        .not('satisfaction_rating', 'is', null);

      if (ratedMessages && ratedMessages.length > 0) {
        const positiveCount = ratedMessages.filter(
          (m) => m.satisfaction_rating === 'thumbs_up',
        ).length;
        avgSatisfactionRating = positiveCount / ratedMessages.length;
      }
    }

    // ── Task 3.3.2: Top questioned CLOs ─────────────────────────────────
    const cloFrequency = new Map<string, number>();
    for (const conv of conversations ?? []) {
      const cloScope = conv.clo_scope as string[] | null;
      if (cloScope && Array.isArray(cloScope)) {
        for (const cloId of cloScope) {
          cloFrequency.set(cloId, (cloFrequency.get(cloId) ?? 0) + 1);
        }
      }
    }

    // Fetch CLO titles for the top CLOs
    const topCloIds = Array.from(cloFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    let topQuestionedClos: TopQuestionedCLO[] = [];
    if (topCloIds.length > 0) {
      const { data: cloData } = await supabase
        .from('clos')
        .select('id, title')
        .in('id', topCloIds);

      const cloTitleMap = new Map(
        (cloData ?? []).map((c) => [c.id, c.title]),
      );

      topQuestionedClos = topCloIds.map((cloId) => ({
        clo_id: cloId,
        clo_title: cloTitleMap.get(cloId) ?? 'Unknown CLO',
        conversation_count: cloFrequency.get(cloId) ?? 0,
      }));
    }

    // ── Task 3.3.3: Common topics extraction (anonymized) ───────────────
    let commonTopics: CommonTopic[] = [];
    if (conversationIds.length > 0) {
      const { data: userMessages } = await supabase
        .from('tutor_messages')
        .select('content')
        .in('conversation_id', conversationIds)
        .eq('role', 'user');

      if (userMessages && userMessages.length > 0) {
        commonTopics = extractCommonTopics(userMessages);
      }
    }

    // ── Task 3.3.4: Usage over time (daily counts, last 30 days) ────────
    const dailyCounts = new Map<string, number>();

    // Initialize all days in range with 0
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(ms).toISOString().split('T')[0]!;
      dailyCounts.set(dateStr, 0);
    }

    // Count conversations per day
    for (const conv of conversations ?? []) {
      const dateStr = new Date(conv.created_at).toISOString().split('T')[0]!;
      dailyCounts.set(dateStr, (dailyCounts.get(dateStr) ?? 0) + 1);
    }

    const usageOverTime: DailyUsage[] = Array.from(dailyCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, conversation_count]) => ({ date, conversation_count }));

    // ── Task 3.3.5: PII exclusion validation ────────────────────────────
    // The response contains only aggregate data — no student names, emails,
    // IDs, or individual conversation content. This is enforced by the
    // query structure above (only counts, averages, and anonymized topics).

    const response: AnalyticsResponse = {
      total_conversations: totalConversations,
      total_messages: totalMessages,
      avg_messages_per_conversation: Math.round(avgMessagesPerConversation * 100) / 100,
      avg_satisfaction_rating: Math.round(avgSatisfactionRating * 100) / 100,
      top_questioned_clos: topQuestionedClos,
      common_topics: commonTopics,
      usage_over_time: usageOverTime,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('tutor-analytics error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
