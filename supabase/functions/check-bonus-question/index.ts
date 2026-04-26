import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TriggerRequest {
  student_id: string;
}

interface AnswerRequest {
  student_id: string;
  question_id: string;
  selected_answer: string;
}

interface BonusQuestion {
  id: string;
  question_text: string;
  options: unknown;
  bloom_level: string;
  clo_id: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BONUS_PROBABILITY = 15; // 15% default
const MIN_PROBABILITY = 5;
const MAX_PROBABILITY = 30;
const BONUS_XP_AMOUNT = 50;

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify JWT and extract user
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? 'trigger';

    if (action === 'trigger') {
      return await handleTrigger(req, supabaseAdmin, user.id);
    } else if (action === 'validate') {
      return await handleValidate(req, supabaseAdmin, user.id);
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use ?action=trigger or ?action=validate' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Trigger Handler ────────────────────────────────────────────────────────

async function handleTrigger(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string,
): Promise<Response> {
  const body: TriggerRequest = await req.json();
  const studentId = body.student_id ?? userId;

  // Get student's institution_id
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('institution_id')
    .eq('id', studentId)
    .single();

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 19.2.1: Probability check (configurable 5–30%) ───────────────────

  // Fetch institution-level bonus question probability
  const { data: settings } = await supabaseAdmin
    .from('institution_settings')
    .select('bonus_question_probability')
    .eq('institution_id', profile.institution_id)
    .maybeSingle();

  const configuredProbability = settings?.bonus_question_probability ?? DEFAULT_BONUS_PROBABILITY;
  // Clamp to valid range [5, 30]
  const probability = Math.max(MIN_PROBABILITY, Math.min(MAX_PROBABILITY, configuredProbability));

  // Roll the dice
  const randomValue = Math.floor(Math.random() * 100);
  const triggered = randomValue < probability;

  if (!triggered) {
    return new Response(JSON.stringify({
      success: true,
      triggered: false,
      question: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 19.2.2: CLO-relevant question selection ──────────────────────────

  // Find CLOs the student is enrolled in (via their courses)
  const { data: enrollments } = await supabaseAdmin
    .from('student_courses')
    .select('course_id')
    .eq('student_id', studentId);

  if (!enrollments || enrollments.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      triggered: true,
      question: null,
      reason: 'No enrolled courses found',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

  // Get CLOs for enrolled courses
  const { data: clos } = await supabaseAdmin
    .from('clos')
    .select('id')
    .in('course_id', courseIds);

  if (!clos || clos.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      triggered: true,
      question: null,
      reason: 'No CLOs found for enrolled courses',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const cloIds = clos.map((c: { id: string }) => c.id);

  // Select a random approved question from the question_bank relevant to student's CLOs
  const { data: questions, error: questionErr } = await supabaseAdmin
    .from('question_bank')
    .select('id, question_text, options, bloom_level, clo_id, correct_answer')
    .in('clo_id', cloIds)
    .eq('status', 'approved')
    .limit(50);

  if (questionErr || !questions || questions.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      triggered: true,
      question: null,
      reason: 'No eligible questions found in question bank',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Pick a random question
  const selectedIndex = Math.floor(Math.random() * questions.length);
  const selectedQuestion = questions[selectedIndex];

  // Return the question WITHOUT the correct answer (client shouldn't see it)
  const questionForClient: BonusQuestion = {
    id: selectedQuestion.id,
    question_text: selectedQuestion.question_text,
    options: selectedQuestion.options,
    bloom_level: selectedQuestion.bloom_level,
    clo_id: selectedQuestion.clo_id,
  };

  return new Response(JSON.stringify({
    success: true,
    triggered: true,
    question: questionForClient,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Validate Handler ───────────────────────────────────────────────────────

async function handleValidate(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string,
): Promise<Response> {
  const body: AnswerRequest = await req.json();
  const { question_id, selected_answer } = body;
  const studentId = body.student_id ?? userId;

  if (!question_id || selected_answer === undefined || selected_answer === null) {
    return new Response(JSON.stringify({ error: 'question_id and selected_answer are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 19.2.3: Answer validation and surprise XP award ───────────────────

  // Fetch the question with correct answer (server-side only)
  const { data: question, error: questionErr } = await supabaseAdmin
    .from('question_bank')
    .select('id, correct_answer, question_text, clo_id')
    .eq('id', question_id)
    .single();

  if (questionErr || !question) {
    return new Response(JSON.stringify({ error: 'Question not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isCorrect = String(selected_answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();

  if (!isCorrect) {
    return new Response(JSON.stringify({
      success: true,
      correct: false,
      correct_answer: question.correct_answer,
      xp_awarded: 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Award surprise XP (50 XP base) via direct insert
  // Use idempotent reference_id to prevent duplicate awards for the same question
  const today = new Date().toISOString().slice(0, 10);
  const referenceId = `bonus_question:${studentId}:${question_id}:${today}`;

  const { error: xpErr } = await supabaseAdmin
    .from('xp_transactions')
    .insert({
      student_id: studentId,
      xp_amount: BONUS_XP_AMOUNT,
      source: 'bonus_event',
      reference_id: referenceId,
      note: `Bonus question correct answer: ${question.question_text?.slice(0, 50)}`,
      base_xp: BONUS_XP_AMOUNT,
      final_xp: BONUS_XP_AMOUNT,
      multipliers: { bonus_question: true },
    });

  if (xpErr) {
    // 23505 = unique_violation — already awarded for this question today
    if (xpErr.code === '23505') {
      return new Response(JSON.stringify({
        success: true,
        correct: true,
        xp_awarded: 0,
        duplicate: true,
        message: 'Already answered this bonus question today',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('Bonus XP insert failed:', xpErr.message);
    return new Response(JSON.stringify({ error: 'Failed to award bonus XP' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update student_gamification xp_total
  const { data: sumResult } = await supabaseAdmin
    .from('xp_transactions')
    .select('xp_amount')
    .eq('student_id', studentId);

  const newTotal = (sumResult ?? []).reduce(
    (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
    0,
  );

  // Calculate level from XP total
  const newLevel = calculateLevel(newTotal);

  await supabaseAdmin
    .from('student_gamification')
    .upsert(
      { student_id: studentId, xp_total: newTotal, level: newLevel },
      { onConflict: 'student_id' },
    );

  // Audit log
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('institution_id')
    .eq('id', studentId)
    .maybeSingle();

  if (profile?.institution_id) {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'bonus_question_answered',
      entity_type: 'bonus_question',
      entity_id: question_id,
      performed_by: userId,
      institution_id: profile.institution_id,
      changes: {
        correct: true,
        xp_awarded: BONUS_XP_AMOUNT,
        clo_id: question.clo_id,
      },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    correct: true,
    xp_awarded: BONUS_XP_AMOUNT,
    new_total: newTotal,
    new_level: newLevel,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Level Calculation (mirrors award-xp) ───────────────────────────────────

function calculateLevel(xpTotal: number): number {
  if (xpTotal < 0) return 1;

  const thresholds = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 250 },
  ];

  for (let n = 4; n <= 50; n++) {
    thresholds.push({ level: n, xpRequired: Math.floor(50 * Math.pow(n, 1.5)) });
  }

  let level = 1;
  for (const t of thresholds) {
    if (xpTotal >= t.xpRequired) level = t.level;
    else break;
  }
  return level;
}
