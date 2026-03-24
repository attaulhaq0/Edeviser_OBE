import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── pg_cron schedule: 0 18 * * * (daily 6 PM) ─────────────────────────────
// Checks each active student's habit completion for the current day.
// If exactly 3 of 4 habits completed, sends an in-app notification
// identifying the missing habit.

type HabitType = 'login' | 'submit' | 'journal' | 'read';

const ALL_HABITS: HabitType[] = ['login', 'submit', 'journal', 'read'];

const HABIT_LABELS: Record<HabitType, string> = {
  login: 'Login',
  submit: 'Submit',
  journal: 'Journal',
  read: 'Read',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch all active students
    const { data: students, error: studentsErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('is_active', true);

    if (studentsErr) {
      console.error('Failed to fetch students:', studentsErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students', detail: studentsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No active students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch all habit logs for today in one batch query
    const studentIds = students.map((s: { id: string }) => s.id);
    const { data: habitLogs, error: habitsErr } = await supabase
      .from('habit_logs')
      .select('student_id, habit_type')
      .in('student_id', studentIds)
      .eq('date', todayUTC);

    if (habitsErr) {
      console.error('Failed to fetch habit logs:', habitsErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch habit logs', detail: habitsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Group habits by student
    const studentHabits = new Map<string, Set<string>>();
    for (const log of (habitLogs ?? [])) {
      const existing = studentHabits.get(log.student_id) ?? new Set();
      existing.add(log.habit_type);
      studentHabits.set(log.student_id, existing);
    }

    let notified = 0;
    let skippedComplete = 0;
    let skippedNotEnough = 0;
    const errors: Array<{ student_id: string; error: string }> = [];

    for (const student of students) {
      const completedHabits = studentHabits.get(student.id) ?? new Set();
      const completedCount = completedHabits.size;

      // Skip students who already completed all 4 habits
      if (completedCount >= 4) {
        skippedComplete++;
        continue;
      }

      // Only notify students with exactly 3 of 4 habits completed
      if (completedCount !== 3) {
        skippedNotEnough++;
        continue;
      }

      // Find the missing habit
      const missingHabit = ALL_HABITS.find((h) => !completedHabits.has(h));
      if (!missingHabit) continue;

      const missingLabel = HABIT_LABELS[missingHabit];

      try {
        // Send in-app notification (not email — this is a nudge)
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: student.id,
          type: 'perfect_day_nudge',
          title: 'Almost a Perfect Day! ✨',
          message: `You're 1 habit away from a Perfect Day! ✨ Complete your ${missingLabel} to earn 50 bonus XP.`,
          is_read: false,
          metadata: {
            missing_habit: missingHabit,
            completed_habits: Array.from(completedHabits),
            date: todayUTC,
          },
        });

        if (notifErr) {
          errors.push({ student_id: student.id, error: notifErr.message });
        } else {
          notified++;
        }
      } catch (err) {
        errors.push({ student_id: student.id, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified,
        skipped_complete: skippedComplete,
        skipped_not_enough: skippedNotEnough,
        total_students: students.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('perfect-day-prompt error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
