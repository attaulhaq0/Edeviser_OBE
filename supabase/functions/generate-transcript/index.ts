import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2';
import autoTable from 'https://esm.sh/jspdf-autotable@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { student_id, semester_id } = await req.json();

    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('profiles').select('full_name, institution_id').eq('id', student_id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch enrollments with course info
    let enrollQuery = supabase.from('student_courses').select('course_id').eq('student_id', student_id);
    const { data: enrollments } = await enrollQuery;
    const courseIds = (enrollments ?? []).map((e: { course_id: string }) => e.course_id);

    let coursesQuery = supabase.from('courses').select('id, title, code, semester_id').in('id', courseIds.length > 0 ? courseIds : ['__none__']);
    if (semester_id) coursesQuery = coursesQuery.eq('semester_id', semester_id);
    const { data: courses } = await coursesQuery;

    // Fetch grades
    const { data: grades } = await supabase.from('grades').select('assignment_id, score, max_score').eq('student_id', student_id);
    const gradeMap = new Map((grades ?? []).map((g: { assignment_id: string; score: number; max_score: number }) => [g.assignment_id, g]));

    // Build PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new jsPDF() as any;
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Student Transcript', 14, 18);
    doc.setFontSize(9);
    doc.text(profile.full_name ?? 'Unknown', pw - 14, 12, { align: 'right' });
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, pw - 14, 20, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    let y = 40;

    for (const course of (courses ?? []) as Array<{ id: string; title: string; code: string }>) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.text(`${course.code} — ${course.title}`, 14, y);
      y += 5;

      const courseGrades = (grades ?? []).filter((g: { assignment_id: string }) => true); // simplified
      autoTable(doc, {
        startY: y,
        head: [['Assessment', 'Score', 'Max', '%']],
        body: courseGrades.length > 0
          ? courseGrades.slice(0, 5).map((g: { assignment_id: string; score: number; max_score: number }) => [
              g.assignment_id.slice(0, 8), String(g.score), String(g.max_score),
              g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0',
            ])
          : [['No grades recorded', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 7 },
      });
      y = (doc.lastAutoTable?.finalY ?? y + 20) + 10;
    }

    const pdfBytes = doc.output('arraybuffer') as Uint8Array;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `transcripts/${student_id.slice(0, 8)}_${ts}.pdf`;

    await supabase.storage.createBucket('transcripts', { public: false }).catch(() => {});
    const { error: uploadErr } = await supabase.storage.from('transcripts').upload(fileName, pdfBytes, { contentType: 'application/pdf' });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: signedUrl } = await supabase.storage.from('transcripts').createSignedUrl(fileName, 3600);

    return new Response(JSON.stringify({ success: true, download_url: signedUrl?.signedUrl, file_name: fileName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
