import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { course_id, section_id } = await req.json();

    if (!course_id) {
      return new Response(
        JSON.stringify({ error: 'course_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build query for grades with student and assignment info
    let query = supabase
      .from('grades')
      .select(`
        id,
        score,
        max_score,
        feedback,
        graded_at,
        submissions!inner (
          student_id,
          assignment_id,
          assignments!inner (
            title,
            course_id
          )
        )
      `)
      .eq('submissions.assignments.course_id', course_id);

    if (section_id) {
      // Filter by section via student_courses
      const { data: sectionStudents } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('section_id', section_id);

      const studentIds = (sectionStudents ?? []).map((s: { student_id: string }) => s.student_id);
      if (studentIds.length > 0) {
        query = query.in('submissions.student_id', studentIds);
      }
    }

    const { data: grades, error: gradesError } = await query;
    if (gradesError) throw gradesError;

    return new Response(
      JSON.stringify({ grades: grades ?? [], count: (grades ?? []).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
