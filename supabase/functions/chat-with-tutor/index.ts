import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ───────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type TutorPersona = "socratic_guide" | "step_by_step_coach" | "quick_explainer";
type AutonomyLevel = "L1" | "L2" | "L3";

interface ChatRequest {
  conversation_id?: string;
  course_id?: string;
  message: string;
  persona?: TutorPersona;
  image_urls?: string[];
  document_url?: string;
  clo_scope?: string[];
  autonomy_override?: "L1" | "L3";
}

interface SourceCitation {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

interface CLOAttainment {
  clo_id: string;
  clo_title: string;
  bloom_level: string;
  attainment_percentage: number;
}

interface RetrievedChunk {
  id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  clo_ids: string[];
  bloom_level: string;
  similarity: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_DAILY_MESSAGE_LIMIT = 50;
const DEFAULT_DAILY_TOKEN_BUDGET = 50000;
const WARNING_THRESHOLD = 0.8; // 80%
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const SIMILARITY_THRESHOLD = 0.7;
const TOP_K_CHUNKS = 5;
const MAX_CONTEXT_MESSAGES = 10;
const XP_AWARD_MESSAGE_THRESHOLD = 3;
const TUTOR_ENGAGEMENT_XP = 15;

// ─── Academic Integrity Patterns (mirrors src/lib/tutorIntegrityDetector.ts) ─

const INTEGRITY_PATTERNS: Array<{ pattern: RegExp; keyword: string }> = [
  { pattern: /\bwrite my essay\b/i, keyword: "write my essay" },
  { pattern: /\bwrite my paper\b/i, keyword: "write my paper" },
  { pattern: /\bwrite my report\b/i, keyword: "write my report" },
  { pattern: /\bwrite my assignment\b/i, keyword: "write my assignment" },
  { pattern: /\bwrite this for me\b/i, keyword: "write this for me" },
  { pattern: /\bdo my homework\b/i, keyword: "do my homework" },
  { pattern: /\bdo my assignment\b/i, keyword: "do my assignment" },
  { pattern: /\bdo this for me\b/i, keyword: "do this for me" },
  { pattern: /\bgive me the answer\b/i, keyword: "give me the answer" },
  { pattern: /\bgive me the answers\b/i, keyword: "give me the answers" },
  { pattern: /\bgive me the solution\b/i, keyword: "give me the solution" },
  { pattern: /\bjust give me\b/i, keyword: "just give me" },
  { pattern: /\bsolve this for me\b/i, keyword: "solve this for me" },
  { pattern: /\bsolve my\b/i, keyword: "solve my" },
  { pattern: /\bcomplete my\b/i, keyword: "complete my" },
  { pattern: /\bcomplete this for me\b/i, keyword: "complete this for me" },
  { pattern: /\bfinish my\b/i, keyword: "finish my" },
  { pattern: /\bfinish this for me\b/i, keyword: "finish this for me" },
  { pattern: /\bdo it for me\b/i, keyword: "do it for me" },
  {
    pattern: /\bjust tell me the answer\b/i,
    keyword: "just tell me the answer",
  },
  { pattern: /\bcopy paste\b/i, keyword: "copy paste" },
  { pattern: /\bsubmit for me\b/i, keyword: "submit for me" },
];

// ─── Persona Prompt Templates ───────────────────────────────────────────────

const PERSONA_PROMPTS: Record<TutorPersona, string> = {
  socratic_guide: [
    "You are a Socratic tutor. Ask probing questions to guide the student toward the answer.",
    "Never give direct answers. Instead, break the problem into smaller questions that lead to understanding.",
    'Use phrases like "What do you think would happen if...?" and "Can you explain why...?"',
  ].join(" "),
  step_by_step_coach: [
    "You are a patient step-by-step coach. Break down every problem into numbered steps.",
    "Explain each step clearly before moving to the next. Check understanding at each step.",
    'Use phrases like "Step 1: Let\'s start by..." and "Now that we understand X, let\'s move to..."',
  ].join(" "),
  quick_explainer: [
    "You are a concise explainer. Give clear, direct explanations with examples.",
    "Keep responses focused and to the point. Use analogies when helpful.",
    "Prioritize clarity over thoroughness — the student can ask follow-up questions.",
  ].join(" "),
};

// ─── Autonomy Level Prompt Modifiers ────────────────────────────────────────

const AUTONOMY_PROMPTS: Record<AutonomyLevel, string> = {
  L1: [
    "AUTONOMY LEVEL L1 (Hints Only): You must NEVER provide direct answers or solutions.",
    "Only ask guiding questions, provide hints, and encourage the student to work through the problem.",
    "If the student asks for a direct answer, redirect them with a question.",
  ].join(" "),
  L2: [
    "AUTONOMY LEVEL L2 (Guided Discovery): Provide scaffolded hints and partial explanations.",
    "Guide the student toward understanding step by step, but do not give complete solutions.",
    "You may explain concepts but should encourage the student to apply them independently.",
  ].join(" "),
  L3: [
    "AUTONOMY LEVEL L3 (Direct Explanation): You may provide complete, direct explanations of concepts.",
    "Give clear answers with examples.",
    "The student is in review/practice mode and benefits from direct instruction.",
  ].join(" "),
};

const SAFETY_INSTRUCTIONS = [
  "IMPORTANT RULES:",
  "- Only reference the provided course materials. If a question falls outside the available content, clearly state that.",
  "- Do not generate content unrelated to the course subject matter.",
  "- Do not provide personal advice or harmful content.",
  "- Guide students toward understanding rather than providing complete solutions to graded assignments.",
  "- Never include student personal information (name, email, ID) in your responses.",
  "- If the student asks you to solve, write, or complete a graded assignment, redirect them pedagogically.",
].join("\n");

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRequest(
  body: unknown
): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (!b.message || typeof b.message !== "string") {
    return { valid: false, error: "message is required and must be a string" };
  }

  if (b.message.length === 0) {
    return { valid: false, error: "message cannot be empty" };
  }

  if (b.message.length > 2000) {
    return { valid: false, error: "message cannot exceed 2000 characters" };
  }

  // conversation_id or course_id required
  if (!b.conversation_id && !b.course_id) {
    return {
      valid: false,
      error: "Either conversation_id or course_id is required",
    };
  }

  // Validate persona if provided
  const validPersonas: TutorPersona[] = [
    "socratic_guide",
    "step_by_step_coach",
    "quick_explainer",
  ];
  if (b.persona && !validPersonas.includes(b.persona as TutorPersona)) {
    return { valid: false, error: "Invalid persona value" };
  }

  // Validate image_urls
  if (b.image_urls) {
    if (!Array.isArray(b.image_urls)) {
      return { valid: false, error: "image_urls must be an array" };
    }
    if (b.image_urls.length > 2) {
      return { valid: false, error: "Maximum 2 images allowed" };
    }
  }

  // Validate autonomy_override
  if (
    b.autonomy_override &&
    b.autonomy_override !== "L1" &&
    b.autonomy_override !== "L3"
  ) {
    return {
      valid: false,
      error: "autonomy_override must be L1 or L3",
    };
  }

  return {
    valid: true,
    data: {
      conversation_id: b.conversation_id as string | undefined,
      course_id: b.course_id as string | undefined,
      message: b.message as string,
      persona: b.persona as TutorPersona | undefined,
      image_urls: b.image_urls as string[] | undefined,
      document_url: b.document_url as string | undefined,
      clo_scope: b.clo_scope as string[] | undefined,
      autonomy_override: b.autonomy_override as "L1" | "L3" | undefined,
    },
  };
}

// ─── Academic Integrity Detection (3.1.9) ───────────────────────────────────

function detectIntegrityViolation(message: string): {
  flagged: boolean;
  matchedKeywords: string[];
} {
  if (!message.trim()) {
    return { flagged: false, matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];
  for (const { pattern, keyword } of INTEGRITY_PATTERNS) {
    if (pattern.test(message)) {
      matchedKeywords.push(keyword);
    }
  }

  return { flagged: matchedKeywords.length > 0, matchedKeywords };
}

// ─── SSE Helpers ────────────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseErrorEvent(code: string, message: string): string {
  return sseEvent("error", { code, message });
}

// ─── Prompt Assembly ────────────────────────────────────────────────────────

function buildCLOContext(cloAttainments: CLOAttainment[]): string {
  if (cloAttainments.length === 0) return "";

  const gaps = cloAttainments.filter((clo) => clo.attainment_percentage < 70);
  const lines: string[] = ["STUDENT CLO PROGRESS:"];

  for (const clo of cloAttainments) {
    const status = clo.attainment_percentage < 70 ? "⚠ NEEDS IMPROVEMENT" : "✓";
    lines.push(
      `- ${clo.clo_title} (Bloom: ${clo.bloom_level}): ${clo.attainment_percentage}% ${status}`
    );
  }

  if (gaps.length > 0) {
    lines.push("");
    lines.push("COMPETENCY GAPS (below 70%):");
    for (const gap of gaps) {
      lines.push(
        `- ${gap.clo_title}: ${gap.attainment_percentage}% — focus tutoring here`
      );
    }
  }

  return lines.join("\n");
}

function buildChunkContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const lines: string[] = ["RELEVANT COURSE MATERIALS:"];
  chunks.forEach((chunk, index) => {
    lines.push(
      `[${index + 1}] Source: ${chunk.source_filename} (${chunk.material_type})`
    );
    lines.push(chunk.chunk_text);
    lines.push("");
  });

  return lines.join("\n");
}

function assembleSystemPrompt(
  persona: TutorPersona,
  autonomyLevel: AutonomyLevel,
  cloAttainments: CLOAttainment[],
  retrievedChunks: RetrievedChunk[],
  courseName?: string,
  integrityFlagged?: boolean,
  toneModifier?: string
): string {
  const sections: string[] = [];

  // 1. Role and course context
  if (courseName) {
    sections.push(`You are an AI tutor for the course "${courseName}".`);
  } else {
    sections.push(
      "You are an AI tutor helping a student with their coursework."
    );
  }

  // 2. Persona instructions
  sections.push(PERSONA_PROMPTS[persona]);

  // 3. Tone modifier (from Big Five neuroticism)
  if (toneModifier) {
    sections.push(toneModifier);
  }

  // 4. Autonomy level
  sections.push(AUTONOMY_PROMPTS[autonomyLevel]);

  // 5. Safety instructions
  sections.push(SAFETY_INSTRUCTIONS);

  // 6. Academic integrity redirect
  if (integrityFlagged) {
    sections.push(
      "ACADEMIC INTEGRITY ALERT: The student's message appears to request direct completion of graded work. " +
        "You MUST redirect them pedagogically. Do NOT provide a direct solution. Instead, help them understand " +
        "the concepts and guide them to work through the problem themselves."
    );
  }

  // 7. CLO context
  const cloContext = buildCLOContext(cloAttainments);
  if (cloContext) {
    sections.push(cloContext);
  }

  // 8. Retrieved chunks
  const chunkContext = buildChunkContext(retrievedChunks);
  if (chunkContext) {
    sections.push(chunkContext);
  }

  return sections.join("\n\n");
}

// ─── Autonomy Level Resolution ──────────────────────────────────────────────

function resolveAutonomyLevel(
  assignmentAutonomy: AutonomyLevel | null,
  cloAutonomy: AutonomyLevel | null,
  studentOverride: "L1" | "L3" | null,
  teacherCeiling: AutonomyLevel | null
): AutonomyLevel {
  // 1. Assignment-level takes precedence over CLO-level
  const baseLevel = assignmentAutonomy ?? cloAutonomy ?? "L2";

  // 2. Student override applies but cannot exceed teacher ceiling
  if (studentOverride) {
    const ceiling = teacherCeiling ?? baseLevel;
    const levels: AutonomyLevel[] = ["L1", "L2", "L3"];
    const ceilingIdx = levels.indexOf(ceiling);
    const overrideIdx = levels.indexOf(studentOverride);
    return levels[Math.min(overrideIdx, ceilingIdx)];
  }

  return baseLevel;
}

// ─── Persona Auto-Selection from Big Five (3.1.5 / Req 26) ─────────────────

function autoSelectPersona(bigFiveProfile: {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}): { persona: TutorPersona; toneModifier?: string } {
  const traits = [
    { trait: "openness", score: bigFiveProfile.openness },
    { trait: "conscientiousness", score: bigFiveProfile.conscientiousness },
    { trait: "neuroticism", score: bigFiveProfile.neuroticism },
  ].sort((a, b) => b.score - a.score);

  const dominant = traits[0];
  let persona: TutorPersona;
  let toneModifier: string | undefined;

  if (dominant.trait === "openness" && dominant.score >= 70) {
    persona = "socratic_guide";
  } else if (dominant.trait === "conscientiousness" && dominant.score >= 70) {
    persona = "step_by_step_coach";
  } else {
    persona = "quick_explainer";
  }

  // High neuroticism adds supportive tone
  if (bigFiveProfile.neuroticism >= 70) {
    toneModifier =
      "Use an especially warm, encouraging, and supportive tone. " +
      "Validate the student's effort frequently. Avoid language that could feel critical or pressuring.";
  }

  return { persona, toneModifier };
}

// ─── Retry Logic with Exponential Backoff (3.1.11) ──────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY_MS,
  fallbackModel?: string
): Promise<{ response: Response; modelUsed: string; retryCount: number }> {
  let lastError: Error | null = null;
  let retryCount = 0;

  // Parse the body to get the model for logging
  const bodyObj = JSON.parse(options.body as string);
  const primaryModel = bodyObj.model as string;

  // Try primary model with retries
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return { response, modelUsed: primaryModel, retryCount: attempt };
      }
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err as Error;
    }

    retryCount = attempt + 1;
    if (attempt < maxRetries - 1) {
      const delay = initialDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // Try fallback model if available
  if (fallbackModel) {
    bodyObj.model = fallbackModel;
    const fallbackOptions = {
      ...options,
      body: JSON.stringify(bodyObj),
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, fallbackOptions);
        if (response.ok || response.status < 500) {
          return {
            response,
            modelUsed: fallbackModel,
            retryCount: retryCount + attempt,
          };
        }
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
      } catch (err) {
        lastError = err as Error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("All retry attempts exhausted");
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 3.1.1: JWT Validation and Course Enrollment Check ─────────────────

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // User-scoped client for JWT validation
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
      JSON.stringify({ error: "Unauthorized: invalid token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const studentId = user.id;
  const institutionId =
    user.app_metadata?.institution_id ??
    user.user_metadata?.institution_id ??
    "";

  // Service-role client for server-side operations (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chatReq = validation.data;

  // Determine course_id from conversation or request
  let courseId = chatReq.course_id ?? null;
  let conversationId = chatReq.conversation_id ?? null;
  let existingConversation: Record<string, unknown> | null = null;

  if (conversationId) {
    // Fetch existing conversation
    const { data: conv, error: convErr } = await supabase
      .from("tutor_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (convErr || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    existingConversation = conv;
    courseId = conv.course_id as string;
  }

  // Verify course enrollment
  if (courseId) {
    const { data: enrollment, error: enrollErr } = await supabase
      .from("student_courses")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollErr || !enrollment) {
      return new Response(
        JSON.stringify({
          error: "You are not enrolled in this course",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // ── 3.1.2: Rate Limit and Token Budget Check ─────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  // Upsert usage record for today
  const { data: usageData, error: usageErr } = await supabase
    .from("tutor_usage_limits")
    .select("id, message_count, token_count")
    .eq("student_id", studentId)
    .eq("usage_date", today)
    .maybeSingle();

  let usageId: string;
  let currentMessageCount = 0;
  let currentTokenCount = 0;

  if (usageErr) {
    console.error("Usage check failed:", usageErr.message);
  }

  if (usageData) {
    usageId = usageData.id;
    currentMessageCount = usageData.message_count;
    currentTokenCount = usageData.token_count;
  } else {
    // Create usage record for today
    const { data: newUsage, error: insertErr } = await supabase
      .from("tutor_usage_limits")
      .insert({
        student_id: studentId,
        institution_id: institutionId,
        usage_date: today,
        message_count: 0,
        token_count: 0,
      })
      .select("id")
      .single();

    if (insertErr) {
      // Handle race condition — another request may have created it
      const { data: retryUsage } = await supabase
        .from("tutor_usage_limits")
        .select("id, message_count, token_count")
        .eq("student_id", studentId)
        .eq("usage_date", today)
        .maybeSingle();

      if (retryUsage) {
        usageId = retryUsage.id;
        currentMessageCount = retryUsage.message_count;
        currentTokenCount = retryUsage.token_count;
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to initialize usage tracking" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      usageId = newUsage.id;
    }
  }

  // Check daily message limit
  if (currentMessageCount >= DEFAULT_DAILY_MESSAGE_LIMIT) {
    return new Response(
      JSON.stringify({
        error: "Daily message limit reached",
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "You've reached your daily message limit. It resets at midnight.",
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check daily token budget
  if (currentTokenCount >= DEFAULT_DAILY_TOKEN_BUDGET) {
    return new Response(
      JSON.stringify({
        error: "Daily token budget exceeded",
        code: "TOKEN_BUDGET_EXCEEDED",
        message:
          "You've exceeded your daily token budget. It resets at midnight.",
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Calculate warning status
  const warningThreshold = Math.floor(
    DEFAULT_DAILY_MESSAGE_LIMIT * WARNING_THRESHOLD
  );
  const remainingMessages = DEFAULT_DAILY_MESSAGE_LIMIT - currentMessageCount;
  const showWarning = currentMessageCount >= warningThreshold;

  // ── Create or fetch conversation ──────────────────────────────────────

  let persona: TutorPersona =
    chatReq.persona ??
    (existingConversation?.persona as TutorPersona) ??
    "socratic_guide";
  let toneModifier: string | undefined;

  let recommendedPersona: TutorPersona | null = null;

  if (!conversationId) {
    // Auto-select persona from Big Five if no persona specified (Req 26)
    if (!chatReq.persona) {
      const { data: profileData } = await supabase
        .from("student_profiles")
        .select("personality_traits")
        .eq("student_id", studentId)
        .order("assessment_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileData?.personality_traits) {
        const bigFive = profileData.personality_traits as {
          openness: number;
          conscientiousness: number;
          extraversion: number;
          agreeableness: number;
          neuroticism: number;
        };
        const autoResult = autoSelectPersona(bigFive);
        persona = autoResult.persona;
        recommendedPersona = autoResult.persona;
        toneModifier = autoResult.toneModifier;
      }
    }

    // Create new conversation
    const { data: newConv, error: convCreateErr } = await supabase
      .from("tutor_conversations")
      .insert({
        student_id: studentId,
        institution_id: institutionId,
        course_id: courseId,
        persona,
        title: chatReq.message.slice(0, 200),
        clo_scope: chatReq.clo_scope ?? [],
        message_count: 0,
        xp_awarded: false,
        autonomy_override: chatReq.autonomy_override ?? null,
        recommended_persona: recommendedPersona,
      })
      .select("id")
      .single();

    if (convCreateErr || !newConv) {
      return new Response(
        JSON.stringify({
          error: "Failed to create conversation",
          detail: convCreateErr?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    conversationId = newConv.id;
  } else {
    // For existing conversations, check Big Five for tone modifier
    if (!chatReq.persona) {
      const { data: profileData } = await supabase
        .from("student_profiles")
        .select("personality_traits")
        .eq("student_id", studentId)
        .order("assessment_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileData?.personality_traits) {
        const bigFive = profileData.personality_traits as {
          openness: number;
          conscientiousness: number;
          extraversion: number;
          agreeableness: number;
          neuroticism: number;
        };
        if (bigFive.neuroticism >= 70) {
          toneModifier =
            "Use an especially warm, encouraging, and supportive tone. " +
            "Validate the student's effort frequently. Avoid language that could feel critical or pressuring.";
        }
      }
    }
  }

  // ── Resolve autonomy level (3.1.5) ────────────────────────────────────

  let assignmentAutonomy: AutonomyLevel | null = null;
  let cloAutonomy: AutonomyLevel | null = null;

  // Check if conversation is scoped to CLOs that have autonomy settings
  const cloScope =
    chatReq.clo_scope ?? (existingConversation?.clo_scope as string[]) ?? [];

  // Fetch assignment autonomy level if CLOs are scoped to an assignment
  if (cloScope.length > 0 && courseId) {
    // Look for assignments that link to these CLOs via clo_weights
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("tutor_autonomy_level")
      .eq("course_id", courseId)
      .not("tutor_autonomy_level", "is", null)
      .limit(1)
      .maybeSingle();

    if (assignmentData?.tutor_autonomy_level) {
      assignmentAutonomy = assignmentData.tutor_autonomy_level as AutonomyLevel;
    }
  }

  if (cloScope.length > 0) {
    // Fetch CLO autonomy level
    const { data: cloData } = await supabase
      .from("learning_outcomes")
      .select("tutor_autonomy_level")
      .in("id", cloScope)
      .not("tutor_autonomy_level", "is", null)
      .limit(1)
      .maybeSingle();

    if (cloData?.tutor_autonomy_level) {
      cloAutonomy = cloData.tutor_autonomy_level as AutonomyLevel;
    }
  }

  const studentOverride =
    chatReq.autonomy_override ??
    (existingConversation?.autonomy_override as "L1" | "L3" | null) ??
    null;

  // Resolve effective autonomy: assignment > CLO > default L2
  // Student override L1 always applies; L3 is capped by teacher ceiling (base level)
  const baseLevel: AutonomyLevel = assignmentAutonomy ?? cloAutonomy ?? "L2";
  let resolvedAutonomy: AutonomyLevel;

  if (studentOverride === null) {
    resolvedAutonomy = baseLevel;
  } else if (studentOverride === "L1") {
    // "Figure it out" — always honor
    resolvedAutonomy = "L1";
  } else {
    // "Just explain it" (L3) — cap by teacher ceiling
    const levels: AutonomyLevel[] = ["L1", "L2", "L3"];
    const ceilingIdx = levels.indexOf(baseLevel);
    const overrideIdx = levels.indexOf(studentOverride);
    resolvedAutonomy = levels[Math.min(overrideIdx, ceilingIdx)];
  }

  // ── 3.1.9: Academic Integrity Detection ───────────────────────────────

  const integrityCheck = detectIntegrityViolation(chatReq.message);

  // ── 3.1.3: Query Embedding Generation via OpenAI API ──────────────────

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let queryEmbedding: number[];
  try {
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: chatReq.message,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error(
        `Embedding API error: ${embeddingResponse.status} ${embeddingResponse.statusText}`
      );
    }

    const embeddingData = await embeddingResponse.json();
    queryEmbedding = embeddingData.data[0].embedding;
  } catch (err) {
    console.error("Embedding generation failed:", (err as Error).message);
    return new Response(
      JSON.stringify({
        error: "Failed to process your message. Please try again.",
        code: "EMBEDDING_ERROR",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // ── 3.1.4: pgvector Similarity Search ─────────────────────────────────

  let retrievedChunks: RetrievedChunk[] = [];

  if (courseId) {
    const matchCloIds = cloScope.length > 0 ? cloScope : null;

    const { data: chunks, error: searchErr } = await supabase.rpc(
      "search_course_materials",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_course_ids: [courseId],
        match_clo_ids: matchCloIds,
        match_threshold: SIMILARITY_THRESHOLD,
        match_count: TOP_K_CHUNKS,
      }
    );

    if (searchErr) {
      console.error("Similarity search failed:", searchErr.message);
      // Non-fatal — continue without RAG context
    } else if (chunks) {
      retrievedChunks = chunks as RetrievedChunk[];
    }
  }

  // ── 3.1.5: CLO Attainment Fetch and System Prompt Assembly ────────────

  let cloAttainments: CLOAttainment[] = [];

  if (courseId) {
    // Fetch CLOs for the course
    const { data: clos } = await supabase
      .from("learning_outcomes")
      .select("id, title, bloom_level")
      .eq("course_id", courseId)
      .eq("type", "CLO");

    if (clos && clos.length > 0) {
      const cloIds = clos.map((c: { id: string }) => c.id);

      // Fetch attainment for these CLOs
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent")
        .eq("student_id", studentId)
        .in("outcome_id", cloIds);

      const attainmentMap = new Map<string, number>();
      for (const a of attainments ?? []) {
        attainmentMap.set(a.outcome_id, a.attainment_percent);
      }

      cloAttainments = clos.map(
        (clo: { id: string; title: string; bloom_level: string }) => ({
          clo_id: clo.id,
          clo_title: clo.title,
          bloom_level: clo.bloom_level ?? "Understanding",
          attainment_percentage: attainmentMap.get(clo.id) ?? 0,
        })
      );
    }
  }

  // Fetch course name for prompt
  let courseName: string | undefined;
  if (courseId) {
    const { data: courseData } = await supabase
      .from("courses")
      .select("name")
      .eq("id", courseId)
      .maybeSingle();

    courseName = courseData?.name ?? undefined;
  }

  // Fetch last 10 messages for conversation context
  const { data: contextMessages } = await supabase
    .from("tutor_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MAX_CONTEXT_MESSAGES);

  // ── 17.2: Same-topic detection and independence nudge ─────────────────

  let independenceNudge: string | null = null;

  if (conversationId && contextMessages && contextMessages.length >= 4) {
    // Check last 3 user messages (excluding current) for same-topic pattern
    const recentUserMessages = contextMessages
      .filter((m: { role: string; content: string }) => m.role === "user")
      .slice(-3);

    if (recentUserMessages.length >= 3) {
      // Simple same-topic detection: check if the last 3 user messages share
      // significant word overlap (>40% of words in common)
      const extractWords = (text: string): Set<string> => {
        const stopWords = new Set([
          "the",
          "a",
          "an",
          "is",
          "are",
          "was",
          "were",
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
          "can",
          "shall",
          "i",
          "me",
          "my",
          "we",
          "you",
          "your",
          "he",
          "she",
          "it",
          "they",
          "them",
          "this",
          "that",
          "what",
          "how",
          "why",
          "when",
          "where",
          "which",
          "who",
          "to",
          "of",
          "in",
          "for",
          "on",
          "with",
          "at",
          "by",
          "from",
          "and",
          "or",
          "but",
          "not",
          "no",
          "so",
          "if",
          "about",
          "help",
          "please",
          "explain",
          "understand",
          "know",
          "think",
          "need",
          "want",
          "get",
          "make",
        ]);
        return new Set(
          text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 2 && !stopWords.has(w))
        );
      };

      const wordSets = recentUserMessages.map((m: { content: string }) =>
        extractWords(m.content)
      );

      // Find common words across all 3 messages
      const commonWords = [...wordSets[0]].filter(
        (w) => wordSets[1].has(w) && wordSets[2].has(w)
      );

      // Calculate overlap ratio relative to the smallest message
      const minSize = Math.min(...wordSets.map((s: Set<string>) => s.size));
      const overlapRatio = minSize > 0 ? commonWords.length / minSize : 0;

      if (overlapRatio >= 0.4 && commonWords.length >= 2) {
        independenceNudge =
          "You're making good progress on this topic. Try working through " +
          "the next step on your own — I believe you can do it! I'm here if you get stuck.";
      }
    }
  }

  // Assemble system prompt (with independence nudge injected if triggered)
  let systemPrompt = assembleSystemPrompt(
    persona,
    resolvedAutonomy,
    cloAttainments,
    retrievedChunks,
    courseName,
    integrityCheck.flagged,
    toneModifier
  );

  // Inject independence nudge into system prompt if triggered
  if (independenceNudge) {
    systemPrompt +=
      "\n\nINDEPENDENCE NUDGE: Before answering, gently encourage the student to try " +
      "working through the problem independently. Be supportive and non-punitive. " +
      "After the encouragement, still answer their question helpfully.";
  }

  // Build messages array for LLM
  const llmMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation context (last 10 messages)
  for (const msg of contextMessages ?? []) {
    llmMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current user message
  llmMessages.push({ role: "user", content: chatReq.message });

  // ── 3.1.6: LLM Streaming via OpenRouter with SSE Response ─────────────

  const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openRouterApiKey) {
    return new Response(
      JSON.stringify({ error: "OpenRouter API key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const primaryModel =
    Deno.env.get("TUTOR_PRIMARY_MODEL") ?? "openai/gpt-4o-mini";
  const fallbackModel = Deno.env.get("TUTOR_FALLBACK_MODEL") ?? undefined;

  const llmRequestBody = {
    model: primaryModel,
    messages: llmMessages,
    stream: true,
    max_tokens: 2000,
    temperature: 0.7,
  };

  const startTime = Date.now();

  let llmResponse: Response;
  let modelUsed: string;
  let retryCount: number;

  // 3.1.11: Retry logic with exponential backoff and model fallback
  try {
    const result = await fetchWithRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "",
          "X-Title": "Edeviser AI Tutor",
        },
        body: JSON.stringify(llmRequestBody),
      },
      MAX_RETRIES,
      INITIAL_RETRY_DELAY_MS,
      fallbackModel
    );

    llmResponse = result.response;
    modelUsed = result.modelUsed;
    retryCount = result.retryCount;
  } catch (err) {
    const latencyMs = Date.now() - startTime;

    // Log the failed LLM call
    await supabase.from("tutor_llm_logs").insert({
      institution_id: institutionId,
      student_id: studentId,
      conversation_id: conversationId,
      model_used: primaryModel,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: latencyMs,
      status: "error",
      error_message: (err as Error).message,
    });

    return new Response(
      JSON.stringify({
        error:
          "The AI Tutor is temporarily unavailable. Please try again in a few minutes.",
        code: "LLM_UNAVAILABLE",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!llmResponse.ok) {
    const latencyMs = Date.now() - startTime;
    const errorText = await llmResponse.text();

    await supabase.from("tutor_llm_logs").insert({
      institution_id: institutionId,
      student_id: studentId,
      conversation_id: conversationId,
      model_used: modelUsed,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: latencyMs,
      status: "error",
      error_message: `HTTP ${llmResponse.status}: ${errorText.slice(0, 500)}`,
    });

    return new Response(
      JSON.stringify({
        error: "Failed to generate response. Please try again.",
        code: "LLM_ERROR",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // ── Stream SSE response ───────────────────────────────────────────────

  const encoder = new TextEncoder();
  let fullAssistantContent = "";
  let promptTokens = 0;
  let completionTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send warning event if near limit
        if (showWarning) {
          controller.enqueue(
            encoder.encode(
              sseEvent("warning", {
                message: `You have ${remainingMessages} messages remaining today.`,
                remaining: remainingMessages,
              })
            )
          );
        }

        // Send citations event before streaming tokens
        if (retrievedChunks.length > 0) {
          const citations: SourceCitation[] = retrievedChunks.map((chunk) => ({
            chunk_id: chunk.id,
            chunk_text: chunk.chunk_text,
            source_filename: chunk.source_filename,
            material_type: chunk.material_type,
            similarity_score: chunk.similarity,
          }));
          controller.enqueue(encoder.encode(sseEvent("citations", citations)));
        }

        // Send independence nudge event if triggered (17.2)
        if (independenceNudge) {
          controller.enqueue(
            encoder.encode(
              sseEvent("independence_nudge", { message: independenceNudge })
            )
          );
        }

        // Parse SSE stream from OpenRouter
        const reader = llmResponse.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              sseErrorEvent("STREAM_ERROR", "No response stream available")
            )
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                fullAssistantContent += delta.content;
                controller.enqueue(
                  encoder.encode(sseEvent("token", delta.content))
                );
              }

              // Capture usage from the final chunk
              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens ?? 0;
                completionTokens = parsed.usage.completion_tokens ?? 0;
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }

        // ── Post-stream processing ────────────────────────────────────

        const latencyMs = Date.now() - startTime;
        const totalTokens = promptTokens + completionTokens;

        // Estimate tokens if usage not provided by the API
        if (totalTokens === 0) {
          // Rough estimate: ~4 chars per token
          promptTokens = Math.ceil(systemPrompt.length / 4);
          completionTokens = Math.ceil(fullAssistantContent.length / 4);
        }

        const finalTotalTokens = promptTokens + completionTokens;

        // ── 3.1.7: Message Persistence ────────────────────────────────

        const sourceCitations: SourceCitation[] = retrievedChunks.map(
          (chunk) => ({
            chunk_id: chunk.id,
            chunk_text: chunk.chunk_text,
            source_filename: chunk.source_filename,
            material_type: chunk.material_type,
            similarity_score: chunk.similarity,
          })
        );

        // Persist user message
        await supabase.from("tutor_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: chatReq.message,
          source_citations: [],
          image_urls: chatReq.image_urls ?? [],
          document_url: chatReq.document_url ?? null,
          token_count: Math.ceil(chatReq.message.length / 4),
          flagged_integrity: integrityCheck.flagged,
          autonomy_level: resolvedAutonomy,
          nudge_type: independenceNudge ? "independence" : null,
        });

        // Persist assistant message
        const { data: assistantMsg } = await supabase
          .from("tutor_messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullAssistantContent,
            source_citations: sourceCitations,
            token_count: completionTokens,
            flagged_integrity: false,
            autonomy_level: resolvedAutonomy,
            nudge_type: independenceNudge ? "independence" : null,
          })
          .select("id")
          .single();

        const assistantMessageId = assistantMsg?.id ?? "";

        // Update conversation message count and updated_at
        const newMessageCount =
          ((existingConversation?.message_count as number) ?? 0) + 2;

        await supabase
          .from("tutor_conversations")
          .update({
            message_count: newMessageCount,
            updated_at: new Date().toISOString(),
            // Update persona if changed
            ...(chatReq.persona ? { persona: chatReq.persona } : {}),
            // Update autonomy override if provided
            ...(chatReq.autonomy_override
              ? { autonomy_override: chatReq.autonomy_override }
              : {}),
          })
          .eq("id", conversationId);

        // ── 3.1.8: Usage Counter Increment and LLM Call Logging ─────

        // Increment usage counters
        await supabase
          .from("tutor_usage_limits")
          .update({
            message_count: currentMessageCount + 1,
            token_count: currentTokenCount + finalTotalTokens,
          })
          .eq("student_id", studentId)
          .eq("usage_date", today);

        // Log LLM call
        await supabase.from("tutor_llm_logs").insert({
          institution_id: institutionId,
          student_id: studentId,
          conversation_id: conversationId,
          model_used: modelUsed,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: finalTotalTokens,
          latency_ms: latencyMs,
          status: "success",
          error_message: null,
        });

        // ── 3.1.10: XP Award Trigger ─────────────────────────────────

        const xpAlreadyAwarded =
          (existingConversation?.xp_awarded as boolean) ?? false;

        if (
          newMessageCount >= XP_AWARD_MESSAGE_THRESHOLD &&
          !xpAlreadyAwarded
        ) {
          // Award tutor engagement XP
          try {
            const awardXpUrl = `${Deno.env.get(
              "SUPABASE_URL"
            )}/functions/v1/award-xp`;
            await fetch(awardXpUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get(
                  "SUPABASE_SERVICE_ROLE_KEY"
                )}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                student_id: studentId,
                xp_amount: TUTOR_ENGAGEMENT_XP,
                source: "tutor_engagement",
                reference_id: conversationId,
                note: "AI Tutor engagement (3+ messages)",
              }),
            });

            // Mark conversation as XP awarded
            await supabase
              .from("tutor_conversations")
              .update({ xp_awarded: true })
              .eq("id", conversationId);
          } catch (xpErr) {
            console.error(
              "XP award failed (non-blocking):",
              (xpErr as Error).message
            );
          }
        }

        // ── 18.2: Handoff Trigger Detection ────────────────────────

        // Check for handoff triggers after message persistence:
        // 1. Low RAG confidence: avg similarity score of retrieved chunks < 0.75
        // 2. Repeated questions: 3+ messages with similar content in conversation
        // 3. Low satisfaction: 2+ thumbs_down ratings in the conversation
        try {
          let handoffReason: string | null = null;
          let handoffMessage = "";

          // 1. Low RAG confidence
          if (retrievedChunks.length > 0) {
            const avgSimilarity =
              retrievedChunks.reduce((sum, c) => sum + c.similarity, 0) /
              retrievedChunks.length;
            if (avgSimilarity < 0.75) {
              handoffReason = "low_rag_confidence";
              handoffMessage =
                "I'm having trouble finding relevant course materials for this topic. Your teacher may be able to help.";
            }
          } else if (courseId) {
            // No chunks retrieved at all — also low confidence
            handoffReason = "low_rag_confidence";
            handoffMessage =
              "I couldn't find relevant course materials for this topic. Your teacher may be able to help.";
          }

          // 2. Repeated questions (3+ user messages with similar content)
          if (
            !handoffReason &&
            contextMessages &&
            contextMessages.length >= 4
          ) {
            const userMsgs = contextMessages
              .filter(
                (m: { role: string; content: string }) => m.role === "user"
              )
              .map((m: { content: string }) => m.content.toLowerCase().trim());

            if (userMsgs.length >= 3) {
              const lastThree = userMsgs.slice(-3);
              // Simple similarity: check if messages share >50% of significant words
              const extractSignificantWords = (text: string): Set<string> => {
                const stopWords = new Set([
                  "the",
                  "a",
                  "an",
                  "is",
                  "are",
                  "was",
                  "were",
                  "be",
                  "been",
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
                  "can",
                  "i",
                  "me",
                  "my",
                  "we",
                  "you",
                  "your",
                  "he",
                  "she",
                  "it",
                  "they",
                  "them",
                  "this",
                  "that",
                  "what",
                  "how",
                  "why",
                  "when",
                  "where",
                  "which",
                  "who",
                  "to",
                  "of",
                  "in",
                  "for",
                  "on",
                  "with",
                  "at",
                  "by",
                  "from",
                  "and",
                  "or",
                  "but",
                  "not",
                  "no",
                  "so",
                  "if",
                  "about",
                  "help",
                  "please",
                  "explain",
                  "understand",
                ]);
                return new Set(
                  text
                    .replace(/[^a-z0-9\s]/g, "")
                    .split(/\s+/)
                    .filter((w) => w.length > 2 && !stopWords.has(w))
                );
              };

              const wordSets = lastThree.map(extractSignificantWords);
              if (
                wordSets[0].size > 0 &&
                wordSets[1].size > 0 &&
                wordSets[2].size > 0
              ) {
                const commonWords = [...wordSets[0]].filter(
                  (w) => wordSets[1].has(w) && wordSets[2].has(w)
                );
                const minSize = Math.min(
                  ...wordSets.map((s: Set<string>) => s.size)
                );
                const overlapRatio =
                  minSize > 0 ? commonWords.length / minSize : 0;

                if (overlapRatio >= 0.5 && commonWords.length >= 2) {
                  handoffReason = "repeated_question";
                  handoffMessage =
                    "It looks like we've been going back and forth on this topic. Your teacher may be able to provide more targeted help.";
                }
              }
            }
          }

          // 3. Low satisfaction (2+ thumbs_down in conversation)
          if (!handoffReason && conversationId) {
            const { count: thumbsDownCount } = await supabase
              .from("tutor_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", conversationId)
              .eq("satisfaction_rating", "thumbs_down");

            if ((thumbsDownCount ?? 0) >= 2) {
              handoffReason = "low_satisfaction";
              handoffMessage =
                "It seems my responses haven't been as helpful as they could be. Your teacher may be able to help.";
            }
          }

          // Stream handoff_suggestion SSE event if triggered
          if (handoffReason) {
            controller.enqueue(
              encoder.encode(
                sseEvent("handoff_suggestion", {
                  reason: handoffReason,
                  message: handoffMessage,
                })
              )
            );
          }
        } catch (handoffErr) {
          console.error(
            "Handoff trigger check failed (non-blocking):",
            (handoffErr as Error).message
          );
        }

        // ── 15.3: Learning Plan Update Trigger ─────────────────────

        // Check if student has 5+ interactions on the same CLO in the last 7 days
        if (courseId && cloScope.length > 0) {
          try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            for (const targetCloId of cloScope) {
              // Count recent interactions on this CLO
              const { count: interactionCount } = await supabase
                .from("tutor_messages")
                .select("id", { count: "exact", head: true })
                .eq("role", "user")
                .in(
                  "conversation_id",
                  // Sub-query: conversations scoped to this CLO
                  (
                    await supabase
                      .from("tutor_conversations")
                      .select("id")
                      .eq("student_id", studentId)
                      .eq("course_id", courseId)
                      .contains("clo_scope", [targetCloId])
                  ).data?.map((c: { id: string }) => c.id) ?? []
                )
                .gte("created_at", sevenDaysAgo.toISOString());

              const recentCount = interactionCount ?? 0;

              // Determine threshold: default 5, but 10 if acceptance rate < 30%
              let triggerThreshold = 5;

              const { data: recentUpdates } = await supabase
                .from("tutor_plan_updates")
                .select("response")
                .eq("student_id", studentId)
                .eq("clo_id", targetCloId)
                .not("response", "is", null)
                .order("created_at", { ascending: false })
                .limit(10);

              if (recentUpdates && recentUpdates.length >= 5) {
                const acceptedCount = recentUpdates.filter(
                  (u: { response: string }) => u.response === "accepted"
                ).length;
                const acceptanceRate = acceptedCount / recentUpdates.length;
                if (acceptanceRate < 0.3) {
                  triggerThreshold = 10;
                }
              }

              // Only trigger if threshold met and divisible by threshold (avoid repeated triggers)
              if (
                recentCount >= triggerThreshold &&
                recentCount % triggerThreshold === 0
              ) {
                // Invoke generate-plan-update Edge Function
                const planUpdateUrl = `${Deno.env.get(
                  "SUPABASE_URL"
                )}/functions/v1/generate-plan-update`;
                const planResponse = await fetch(planUpdateUrl, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get(
                      "SUPABASE_SERVICE_ROLE_KEY"
                    )}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    student_id: studentId,
                    clo_id: targetCloId,
                    course_id: courseId,
                    conversation_id: conversationId,
                    recent_interaction_count: recentCount,
                  }),
                });

                if (planResponse.ok) {
                  const planData = await planResponse.json();
                  controller.enqueue(
                    encoder.encode(sseEvent("plan_update", planData))
                  );
                }
              }
            }
          } catch (planErr) {
            console.error(
              "Plan update check failed (non-blocking):",
              (planErr as Error).message
            );
          }
        }

        // ── Send done event ───────────────────────────────────────────

        controller.enqueue(
          encoder.encode(
            sseEvent("done", {
              message_id: assistantMessageId,
              tokens_used: finalTotalTokens,
            })
          )
        );

        controller.close();
      } catch (streamErr) {
        console.error("Stream processing error:", (streamErr as Error).message);
        try {
          controller.enqueue(
            encoder.encode(
              sseErrorEvent(
                "STREAM_ERROR",
                "An error occurred while generating the response."
              )
            )
          );
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
