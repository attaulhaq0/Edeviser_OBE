import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type EmailTemplate =
  | 'streak_risk'
  | 'weekly_summary'
  | 'new_assignment'
  | 'grade_released'
  | 'bulk_import_invitation'
  | 'parent_grade_released'
  | 'parent_attendance_alert'
  | 'parent_at_risk_warning';

interface EmailPayload {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

interface EmailPreferences {
  streak_risk: boolean;
  weekly_summary: boolean;
  new_assignment: boolean;
  grade_released: boolean;
}

const VALID_TEMPLATES: EmailTemplate[] = [
  'streak_risk',
  'weekly_summary',
  'new_assignment',
  'grade_released',
  'bulk_import_invitation',
  'parent_grade_released',
  'parent_attendance_alert',
  'parent_at_risk_warning',
];

const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  streak_risk: true,
  weekly_summary: true,
  new_assignment: true,
  grade_released: true,
};

// Templates that respect user opt-out preferences
const OPT_OUT_TEMPLATES: EmailTemplate[] = [
  'streak_risk',
  'weekly_summary',
  'new_assignment',
  'grade_released',
];

// ─── Retry Logic ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  resendApiKey: string,
  emailBody: { from: string; to: string; subject: string; html: string },
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(emailBody),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorBody = await response.text();
      console.error(`Resend API attempt ${attempt}/${MAX_RETRIES} failed: ${response.status} ${errorBody}`);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s
        await sleep(backoffMs);
      }
    } catch (err) {
      console.error(`Resend API attempt ${attempt}/${MAX_RETRIES} network error:`, (err as Error).message);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await sleep(backoffMs);
      }
    }
  }

  return { success: false, error: `Failed after ${MAX_RETRIES} retries` };
}

// ─── Template Rendering ─────────────────────────────────────────────────────

function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): { subject: string; html: string } {
  switch (template) {
    case 'streak_risk':
      return {
        subject: '🔥 Your streak is at risk!',
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Your streak is at risk!</h2>
            <p>Hi ${data.student_name ?? 'there'},</p>
            <p>You haven't logged in today and your <strong>${data.streak_count ?? 0}-day streak</strong> is at risk of breaking.</p>
            <p>Log in before midnight to keep your streak alive! 🔥</p>
            <a href="${data.login_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Log In Now</a>
          </div>
        `,
      };

    case 'weekly_summary':
      return {
        subject: '📊 Your Weekly Learning Summary',
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Your Weekly Summary</h2>
            <p>Hi ${data.student_name ?? 'there'},</p>
            <p>Here's what you accomplished this week:</p>
            <ul>
              <li><strong>XP Earned:</strong> ${data.xp_earned ?? 0} XP</li>
              <li><strong>Current Streak:</strong> ${data.streak_count ?? 0} days</li>
              <li><strong>Badges Earned:</strong> ${data.badges_earned ?? 0}</li>
              <li><strong>Submissions:</strong> ${data.submissions_count ?? 0}</li>
            </ul>
            <p>Keep up the great work! 🎉</p>
            <a href="${data.dashboard_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
          </div>
        `,
      };

    case 'new_assignment':
      return {
        subject: `📝 New Assignment: ${data.assignment_title ?? 'Untitled'}`,
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">New Assignment Posted</h2>
            <p>Hi ${data.student_name ?? 'there'},</p>
            <p>A new assignment has been posted in <strong>${data.course_name ?? 'your course'}</strong>:</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">${data.assignment_title ?? 'Untitled'}</h3>
              <p style="margin: 0; color: #64748b;">Due: ${data.due_date ?? 'TBD'}</p>
            </div>
            <a href="${data.assignment_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Assignment</a>
          </div>
        `,
      };

    case 'grade_released':
      return {
        subject: `📋 Grade Released: ${data.assignment_title ?? 'Assignment'}`,
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Your Grade is Ready</h2>
            <p>Hi ${data.student_name ?? 'there'},</p>
            <p>Your grade for <strong>${data.assignment_title ?? 'an assignment'}</strong> in ${data.course_name ?? 'your course'} has been released.</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Score:</strong> ${data.score ?? 'N/A'}%</p>
            </div>
            <a href="${data.grade_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Feedback</a>
          </div>
        `,
      };

    case 'bulk_import_invitation':
      return {
        subject: '🎓 Welcome to Edeviser!',
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Welcome to Edeviser!</h2>
            <p>Hi ${data.full_name ?? 'there'},</p>
            <p>You've been invited to join <strong>${data.institution_name ?? 'your institution'}</strong> on Edeviser as a <strong>${data.role ?? 'user'}</strong>.</p>
            <p>Click below to set up your account:</p>
            <a href="${data.invite_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Set Up Account</a>
          </div>
        `,
      };

    case 'parent_grade_released':
      return {
        subject: `📋 Grade Released for ${data.student_name ?? 'your child'}`,
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Grade Released</h2>
            <p>Hi ${data.parent_name ?? 'there'},</p>
            <p>A grade has been released for <strong>${data.student_name ?? 'your child'}</strong> in <strong>${data.course_name ?? 'a course'}</strong>.</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Assignment:</strong> ${data.assignment_title ?? 'N/A'}</p>
              <p style="margin: 0;"><strong>Score:</strong> ${data.score ?? 'N/A'}%</p>
            </div>
            <a href="${data.dashboard_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
          </div>
        `,
      };

    case 'parent_attendance_alert':
      return {
        subject: `⚠️ Attendance Alert for ${data.student_name ?? 'your child'}`,
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Attendance Alert</h2>
            <p>Hi ${data.parent_name ?? 'there'},</p>
            <p><strong>${data.student_name ?? 'Your child'}</strong>'s attendance in <strong>${data.course_name ?? 'a course'}</strong> has dropped below 75%.</p>
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #dc2626;"><strong>Current Attendance:</strong> ${data.attendance_percent ?? 0}%</p>
            </div>
            <p>Please encourage regular attendance to support their academic success.</p>
            <a href="${data.dashboard_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
          </div>
        `,
      };

    case 'parent_at_risk_warning':
      return {
        subject: `🚨 At-Risk Warning for ${data.student_name ?? 'your child'}`,
        html: `
          <div style="font-family: 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">At-Risk Warning</h2>
            <p>Hi ${data.parent_name ?? 'there'},</p>
            <p><strong>${data.student_name ?? 'Your child'}</strong> has been flagged as at-risk in <strong>${data.course_name ?? 'a course'}</strong>.</p>
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #dc2626;"><strong>Risk Level:</strong> ${data.risk_level ?? 'High'}</p>
              <p style="margin: 4px 0 0 0; color: #64748b;">${data.risk_reason ?? 'Multiple performance indicators suggest the student may need additional support.'}</p>
            </div>
            <p>We recommend reaching out to the student and their teacher to discuss support options.</p>
            <a href="${data.dashboard_url ?? '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
          </div>
        `,
      };

    default:
      return { subject: 'Edeviser Notification', html: '<p>You have a new notification.</p>' };
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown,
): { valid: true; data: EmailPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.to || typeof p.to !== 'string') {
    return { valid: false, error: 'to is required and must be a string' };
  }

  if (!p.template || typeof p.template !== 'string' || !VALID_TEMPLATES.includes(p.template as EmailTemplate)) {
    return { valid: false, error: `template is required and must be one of: ${VALID_TEMPLATES.join(', ')}` };
  }

  if (p.data !== undefined && (typeof p.data !== 'object' || p.data === null)) {
    return { valid: false, error: 'data must be an object if provided' };
  }

  return {
    valid: true,
    data: {
      to: p.to as string,
      template: p.template as EmailTemplate,
      data: (p.data as Record<string, unknown>) ?? {},
    },
  };
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require admin role or internal service call ────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const role = user.app_metadata?.role ?? user.user_metadata?.role ?? '';
      if (role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { to, template, data } = validation.data;

    // ── Check email preferences (opt-out) ─────────────────────────────
    if (OPT_OUT_TEMPLATES.includes(template)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_preferences')
        .eq('email', to)
        .maybeSingle();

      if (profile) {
        const prefs: EmailPreferences = {
          ...DEFAULT_EMAIL_PREFERENCES,
          ...(profile.email_preferences as Partial<EmailPreferences> ?? {}),
        };

        if (!prefs[template as keyof EmailPreferences]) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: 'User opted out of this notification type' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    // ── Render template ───────────────────────────────────────────────
    const { subject, html } = renderTemplate(template, data);

    // ── Send email via Resend with retry ──────────────────────────────
    const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'Edeviser <noreply@edeviser.com>';

    const result = await sendWithRetry(resendApiKey, {
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (!result.success) {
      console.error(`Email delivery failed for ${to} (template: ${template}): ${result.error}`);
      return new Response(
        JSON.stringify({ error: 'Email delivery failed', detail: result.error }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, template, to }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-email-notification error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
