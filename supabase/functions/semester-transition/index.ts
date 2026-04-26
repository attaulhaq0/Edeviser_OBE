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

    const { source_semester_id, target_semester_id, program_id } = await req.json();

    if (!source_semester_id || !target_semester_id || !program_id) {
      return new Response(
        JSON.stringify({ error: 'source_semester_id, target_semester_id, and program_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch courses from source semester in the given program
    const { data: sourceCourses, error: courseError } = await supabase
      .from('courses')
      .select('id, name, code, program_id, teacher_id, description')
      .eq('semester_id', source_semester_id)
      .eq('program_id', program_id);

    if (courseError) throw courseError;

    let copiedCourses = 0;
    let copiedClos = 0;

    for (const course of sourceCourses ?? []) {
      // Create new course in target semester
      const { data: newCourse, error: insertError } = await supabase
        .from('courses')
        .insert({
          name: course.name,
          code: course.code,
          program_id: course.program_id,
          teacher_id: course.teacher_id,
          description: course.description,
          semester_id: target_semester_id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      copiedCourses++;

      // Copy CLOs from source course
      const { data: clos, error: cloError } = await supabase
        .from('learning_outcomes')
        .select('title, description, blooms_level, type, weight, institution_id, program_id, created_by')
        .eq('course_id', course.id)
        .eq('type', 'CLO');

      if (cloError) throw cloError;

      for (const clo of clos ?? []) {
        const { error: cloInsertError } = await supabase
          .from('learning_outcomes')
          .insert({
            ...clo,
            course_id: newCourse.id,
          });

        if (cloInsertError) throw cloInsertError;
        copiedClos++;
      }
    }

    return new Response(
      JSON.stringify({ copied_courses: copiedCourses, copied_clos: copiedClos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
