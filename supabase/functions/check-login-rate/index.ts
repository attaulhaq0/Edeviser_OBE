import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// ─── Types ──────────────────────────────────────────────────────────────────

type Action = 'check' | 'record_failure' | 'clear';

interface RequestPayload {
  email: string;
  action: Action;
}

interface CheckResponse {
  locked: boolean;
  remaining_seconds: number;
}

interface RecordFailureResponse {
  locked: boolean;
  remaining_seconds: number;
  attempt_count: number;
}

interface ClearResponse {
  cleared: boolean;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_ACTIONS: Action[] = ['check', 'record_failure', 'clear'];

function validatePayload(
  payload: unknown,
): { valid: true; data: RequestPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.email || typeof p.email !== 'string' || p.email.trim().length === 0) {
    return { valid: false, error: 'email is required and must be a non-empty string' };
  }

  if (!p.action || typeof p.action !== 'string' || !VALID_ACTIONS.includes(p.action as Action)) {
    return {
      valid: false,
      error: `action is required and must be one of: ${VALID_ACTIONS.join(', ')}`,
    };
  }

  return {
    valid: true,
    data: {
      email: p.email.toLowerCase().trim(),
      action: p.action as Action,
    },
  };
}


// ─── Helpers ────────────────────────────────────────────────────────────────

function getRemainingSeconds(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  const remaining = new Date(lockedUntil).getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function jsonResponse(
  body: CheckResponse | RecordFailureResponse | ClearResponse | { error: string },
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Action Handlers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheck(supabase: ReturnType<typeof createClient>, email: string): Promise<Response> {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('attempt_count, locked_until')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Failed to check login attempts:', error.message);
    return jsonResponse({ error: 'Failed to check rate limit' }, 500);
  }

  if (!data) {
    return jsonResponse({ locked: false, remaining_seconds: 0 });
  }

  const remaining = getRemainingSeconds(data.locked_until);

  // Lock expired — clean up
  if (data.locked_until && remaining === 0) {
    await supabase.from('login_attempts').delete().eq('email', email);
    return jsonResponse({ locked: false, remaining_seconds: 0 });
  }

  return jsonResponse({ locked: remaining > 0, remaining_seconds: remaining });
}

async function handleRecordFailure(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<Response> {
  // Fetch current record
  const { data: existing } = await supabase
    .from('login_attempts')
    .select('attempt_count, locked_until')
    .eq('email', email)
    .maybeSingle();

  // If already locked and lock hasn't expired, return current lock status
  if (existing?.locked_until) {
    const remaining = getRemainingSeconds(existing.locked_until);
    if (remaining > 0) {
      return jsonResponse({
        locked: true,
        remaining_seconds: remaining,
        attempt_count: existing.attempt_count,
      });
    }
  }

  const currentCount = existing?.attempt_count ?? 0;
  const newCount = currentCount + 1;
  const now = new Date().toISOString();

  // Determine if we should lock
  const lockedUntil =
    newCount >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

  // Upsert the record
  const { error } = await supabase.from('login_attempts').upsert(
    {
      email,
      attempt_count: newCount,
      locked_until: lockedUntil,
      updated_at: now,
    },
    { onConflict: 'email' },
  );

  if (error) {
    console.error('Failed to record login attempt:', error.message);
    return jsonResponse({ error: 'Failed to record attempt' }, 500);
  }

  const remaining = lockedUntil ? getRemainingSeconds(lockedUntil) : 0;

  return jsonResponse({
    locked: remaining > 0,
    remaining_seconds: remaining,
    attempt_count: newCount,
  });
}

async function handleClear(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<Response> {
  const { error } = await supabase.from('login_attempts').delete().eq('email', email);

  if (error) {
    console.error('Failed to clear login attempts:', error.message);
    return jsonResponse({ error: 'Failed to clear attempts' }, 500);
  }

  return jsonResponse({ cleared: true });
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const { email, action } = validation.data;

    switch (action) {
      case 'check':
        return await handleCheck(supabase, email);
      case 'record_failure':
        return await handleRecordFailure(supabase, email);
      case 'clear':
        return await handleClear(supabase, email);
      default:
        return jsonResponse({ error: `Unknown action: ${action as string}` }, 400);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
