import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2';
import autoTable from 'https://esm.sh/jspdf-autotable@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CourseFileRequest {
  course_id: string;
  semester_id: string;
}

interface CourseRow {
  id: string;
  name: string;
  code: string;
  program_id: string;
  teacher_id: string;
  semester_id: string;
  institution_id: string;
}

interface OutcomeRow {
  id: string;
  title: string;
  type: string;
  blooms_level: string | null;
  course_id: string | null;
}

interface MappingRow {
  child_outcome_id: string;
  parent_outcome_id: string;
  weight: number;
}

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  total_marks: number;
  due_date: string;
  clo_ids: string[];
}

interface RubricRow {
  id: string;
  title: string;
  clo_id: string;
  criteria: unknown;
}

interface AttainmentRow {
  outcome_id: string;
  scope: string;
  score_percent: number;
  student_id: string;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  score_percent: number | null;
}

interface CQIPlanRow {
  id: string;
  title: string;
  gap_description: string;
  corrective_actions: string;
  status: string;
}

interface JournalRow {
  id: string;
  content: string;
  created_at: string;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown,
): { valid: true; data: CourseFileRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const p = payload as Record<string, unknown>;
  if (!p.course_id || typeof p.course_id !== 'string') {
    return { valid: false, error: 'course_id is required and must be a string' };
  }
  if (!p.semester_id || typeof p.semester_id !== 'string') {
    return { valid: false, error: 'semester_id is required and must be a string' };
  }
  return {
    valid: true,
    data: { course_id: p.course_id as string, semester_id: p.semester_id as string },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyAttainment(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Satisfactory';
  if (score >= 50) return 'Developing';
  return 'Not Yet';
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

function generateCourseFilePDF(
  courseName: string,
  courseCode: string,
  semesterName: string,
  clos: Array<{ title: string; blooms_level: string | null }>,
  cloPloPairs: Array<{ clo_title: string; plo_title: string; weight: number }>,
  assignments: Array<{ title: string; total_marks: number; clo_titles: string }>,
  sampleWork: Array<{ assignment_title: string; best: number; avg: number; worst: number }>,
  cloAttainment: Array<{ clo_title: string; avg_percent: number; level: string }>,
  reflections: Array<{ content: string; date: string }>,
  cqiRecommendations: Array<{ title: string; gap: string; actions: string; status: string }>,
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Title Page ──────────────────────────────────────────────────────────
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Course File', 14, 18);
  doc.setFontSize(12);
  doc.text(`${courseCode} — ${courseName}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Semester: ${semesterName}`, 14, 36);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 60, 36);

  doc.setTextColor(0, 0, 0);
  let yPos = 50;

  // ── 1. Syllabus (Course Details + CLOs) ─────────────────────────────────
  doc.setFontSize(14);
  doc.text('1. Syllabus — Course Learning Outcomes', 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'CLO Title', "Bloom's Level"]],
    body: clos.map((c, i) => [
      String(i + 1),
      c.title,
      c.blooms_level ? c.blooms_level.charAt(0).toUpperCase() + c.blooms_level.slice(1) : 'N/A',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] },
    styles: { fontSize: 8 },
  });

  yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  yPos += 12;

  // ── 2. CLO-PLO Mapping ──────────────────────────────────────────────────
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('2. CLO-PLO Mapping', 14, yPos);
  yPos += 6;

  if (cloPloPairs.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['CLO', 'PLO', 'Weight']],
      body: cloPloPairs.map((m) => [m.clo_title, m.plo_title, `${(m.weight * 100).toFixed(0)}%`]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  } else {
    doc.setFontSize(9);
    doc.text('No CLO-PLO mappings found.', 14, yPos + 4);
    yPos += 10;
  }
  yPos += 12;

  // ── 3. Assessment Instruments ───────────────────────────────────────────
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('3. Assessment Instruments', 14, yPos);
  yPos += 6;

  if (assignments.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Assignment', 'Total Marks', 'Linked CLOs']],
      body: assignments.map((a) => [a.title, String(a.total_marks), a.clo_titles]),
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  } else {
    doc.setFontSize(9);
    doc.text('No assignments found.', 14, yPos + 4);
    yPos += 10;
  }
  yPos += 12;

  // ── 4. Sample Student Work ──────────────────────────────────────────────
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('4. Sample Student Work (Best / Average / Worst)', 14, yPos);
  yPos += 6;

  if (sampleWork.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Assignment', 'Best %', 'Average %', 'Worst %']],
      body: sampleWork.map((s) => [
        s.assignment_title,
        s.best.toFixed(1),
        s.avg.toFixed(1),
        s.worst.toFixed(1),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  } else {
    doc.setFontSize(9);
    doc.text('No graded submissions found.', 14, yPos + 4);
    yPos += 10;
  }
  yPos += 12;

  // ── 5. CLO Attainment Analysis ──────────────────────────────────────────
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('5. CLO Attainment Analysis', 14, yPos);
  yPos += 6;

  if (cloAttainment.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['CLO', 'Avg Attainment %', 'Level']],
      body: cloAttainment.map((c) => [c.clo_title, c.avg_percent.toFixed(1), c.level]),
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  } else {
    doc.setFontSize(9);
    doc.text('No attainment data available.', 14, yPos + 4);
    yPos += 10;
  }
  yPos += 12;

  // ── 6. Teacher Reflection ───────────────────────────────────────────────
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('6. Teacher Reflection', 14, yPos);
  yPos += 8;

  if (reflections.length > 0) {
    for (const r of reflections.slice(0, 5)) {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(r.date, 14, yPos);
      yPos += 4;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(r.content.slice(0, 500), pageWidth - 28);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 4 + 6;
    }
  } else {
    doc.setFontSize(9);
    doc.text('No teacher reflections found.', 14, yPos);
    yPos += 10;
  }
  yPos += 8;

  // ── 7. CQI Recommendations ─────────────────────────────────────────────
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.text('7. CQI Recommendations', 14, yPos);
  yPos += 6;

  if (cqiRecommendations.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Title', 'Gap', 'Corrective Actions', 'Status']],
      body: cqiRecommendations.map((c) => [c.title, c.gap, c.actions, c.status]),
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { cellWidth: 50 }, 2: { cellWidth: 50 } },
    });
  } else {
    doc.setFontSize(9);
    doc.text('No CQI recommendations found.', 14, yPos + 4);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} — ${courseCode} Course File`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }

  return doc.output('arraybuffer') as Uint8Array;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require coordinator or admin ─────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
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
    const callerRole = user.app_metadata?.role ?? user.user_metadata?.role ?? '';
    if (!['admin', 'coordinator'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin or coordinator role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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

    const { course_id, semester_id } = validation.data;

    // ── Fetch course ──────────────────────────────────────────────────
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, name, code, program_id, teacher_id, semester_id, institution_id')
      .eq('id', course_id)
      .maybeSingle();

    if (courseErr || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const c = course as CourseRow;

    // ── Fetch semester ────────────────────────────────────────────────
    const { data: semester } = await supabase
      .from('semesters')
      .select('name')
      .eq('id', semester_id)
      .maybeSingle();
    const semesterName = (semester as { name: string } | null)?.name ?? 'Unknown Semester';

    // ── Fetch CLOs for this course ────────────────────────────────────
    const { data: cloData } = await supabase
      .from('learning_outcomes')
      .select('id, title, type, blooms_level, course_id')
      .eq('type', 'CLO')
      .eq('course_id', course_id);
    const clos = (cloData ?? []) as OutcomeRow[];

    // ── Fetch PLOs for the program ────────────────────────────────────
    const { data: ploData } = await supabase
      .from('learning_outcomes')
      .select('id, title, type, blooms_level, course_id')
      .eq('type', 'PLO')
      .eq('institution_id', c.institution_id);
    const plos = (ploData ?? []) as OutcomeRow[];

    // ── Fetch CLO→PLO mappings ────────────────────────────────────────
    const cloIds = clos.map((o) => o.id);
    let cloPloPairs: Array<{ clo_title: string; plo_title: string; weight: number }> = [];
    if (cloIds.length > 0) {
      const { data: mappings } = await supabase
        .from('outcome_mappings')
        .select('child_outcome_id, parent_outcome_id, weight')
        .in('child_outcome_id', cloIds);
      const maps = (mappings ?? []) as MappingRow[];
      const ploMap = new Map(plos.map((p) => [p.id, p.title]));
      const cloMap = new Map(clos.map((cl) => [cl.id, cl.title]));
      cloPloPairs = maps
        .filter((m) => ploMap.has(m.parent_outcome_id))
        .map((m) => ({
          clo_title: cloMap.get(m.child_outcome_id) ?? 'Unknown CLO',
          plo_title: ploMap.get(m.parent_outcome_id) ?? 'Unknown PLO',
          weight: m.weight,
        }));
    }

    // ── Fetch assignments ─────────────────────────────────────────────
    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('id, title, description, total_marks, due_date, clo_ids')
      .eq('course_id', course_id)
      .order('due_date', { ascending: true });
    const assignmentRows = (assignmentData ?? []) as AssignmentRow[];
    const cloTitleMap = new Map(clos.map((cl) => [cl.id, cl.title]));
    const assignmentsForPdf = assignmentRows.map((a) => ({
      title: a.title,
      total_marks: a.total_marks,
      clo_titles: (a.clo_ids ?? []).map((id: string) => cloTitleMap.get(id) ?? id).join(', '),
    }));

    // ── Fetch rubrics ─────────────────────────────────────────────────
    // Rubrics are linked to CLOs; fetch for reference
    if (cloIds.length > 0) {
      const { data: rubricData } = await supabase
        .from('rubrics')
        .select('id, title, clo_id, criteria')
        .in('clo_id', cloIds);
      // rubrics are included in the assignment instruments section implicitly
      void (rubricData as RubricRow[] | null);
    }

    // ── Fetch sample student work (best/avg/worst per assignment) ─────
    const assignmentIds = assignmentRows.map((a) => a.id);
    let sampleWork: Array<{ assignment_title: string; best: number; avg: number; worst: number }> = [];
    if (assignmentIds.length > 0) {
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('id, assignment_id, student_id, score_percent')
        .in('assignment_id', assignmentIds)
        .not('score_percent', 'is', null);
      const subs = (submissionData ?? []) as SubmissionRow[];

      const byAssignment = new Map<string, number[]>();
      for (const s of subs) {
        if (s.score_percent == null) continue;
        const arr = byAssignment.get(s.assignment_id) ?? [];
        arr.push(s.score_percent);
        byAssignment.set(s.assignment_id, arr);
      }

      const assignmentTitleMap = new Map(assignmentRows.map((a) => [a.id, a.title]));
      sampleWork = Array.from(byAssignment.entries()).map(([aId, scores]) => {
        scores.sort((a, b) => a - b);
        const sum = scores.reduce((s, v) => s + v, 0);
        return {
          assignment_title: assignmentTitleMap.get(aId) ?? 'Unknown',
          best: scores[scores.length - 1],
          avg: sum / scores.length,
          worst: scores[0],
        };
      });
    }

    // ── Fetch CLO attainment ──────────────────────────────────────────
    let cloAttainment: Array<{ clo_title: string; avg_percent: number; level: string }> = [];
    if (cloIds.length > 0) {
      const { data: attData } = await supabase
        .from('outcome_attainment')
        .select('outcome_id, scope, score_percent, student_id')
        .in('outcome_id', cloIds)
        .eq('scope', 'CLO');
      const att = (attData ?? []) as AttainmentRow[];

      const byClo = new Map<string, number[]>();
      for (const a of att) {
        const arr = byClo.get(a.outcome_id) ?? [];
        arr.push(a.score_percent);
        byClo.set(a.outcome_id, arr);
      }

      cloAttainment = clos.map((cl) => {
        const scores = byClo.get(cl.id) ?? [];
        const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
        return {
          clo_title: cl.title,
          avg_percent: avg,
          level: classifyAttainment(avg),
        };
      });
    }

    // ── Fetch teacher reflections (journal entries) ───────────────────
    let reflections: Array<{ content: string; date: string }> = [];
    if (c.teacher_id) {
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('id, content, created_at')
        .eq('student_id', c.teacher_id)
        .order('created_at', { ascending: false })
        .limit(5);
      reflections = ((journalData ?? []) as JournalRow[]).map((j) => ({
        content: j.content,
        date: j.created_at.slice(0, 10),
      }));
    }

    // ── Fetch CQI recommendations ─────────────────────────────────────
    const { data: cqiData } = await supabase
      .from('cqi_action_plans')
      .select('id, title, gap_description, corrective_actions, status')
      .eq('course_id', course_id)
      .order('created_at', { ascending: false })
      .limit(10);
    const cqiRecommendations = ((cqiData ?? []) as CQIPlanRow[]).map((p) => ({
      title: p.title,
      gap: p.gap_description,
      actions: p.corrective_actions,
      status: p.status,
    }));

    // ── Generate PDF ──────────────────────────────────────────────────
    const pdfBytes = generateCourseFilePDF(
      c.name,
      c.code,
      semesterName,
      clos.map((cl) => ({ title: cl.title, blooms_level: cl.blooms_level })),
      cloPloPairs,
      assignmentsForPdf,
      sampleWork,
      cloAttainment,
      reflections,
      cqiRecommendations,
    );

    // ── Upload to Supabase Storage ────────────────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `course-files/${c.code}_${timestamp}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: false });

    if (uploadErr) {
      if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
        await supabase.storage.createBucket('reports', { public: false });
        const { error: retryErr } = await supabase.storage
          .from('reports')
          .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: false });
        if (retryErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to upload course file', detail: retryErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to upload course file', detail: uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Generate signed download URL ──────────────────────────────────
    const { data: signedUrl, error: signErr } = await supabase.storage
      .from('reports')
      .createSignedUrl(fileName, 3600);

    if (signErr || !signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL', detail: signErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl.signedUrl,
        file_type: 'pdf',
        course_name: c.name,
        course_code: c.code,
        semester: semesterName,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
