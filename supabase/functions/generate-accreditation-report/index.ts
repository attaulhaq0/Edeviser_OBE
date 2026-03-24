import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2';
import autoTable from 'https://esm.sh/jspdf-autotable@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type ReportTemplate = 'ABET' | 'HEC' | 'Generic';

interface ReportRequest {
  program_id: string;
  semester_id?: string;
  template: ReportTemplate;
  chart_images?: Record<string, string>; // key → base64 PNG/SVG
  email_to?: string; // optional email delivery
}

interface AttainmentRow {
  outcome_id: string;
  scope: string;
  score_percent: number;
  student_id: string;
  course_id: string | null;
}

interface OutcomeRow {
  id: string;
  title: string;
  type: string;
  blooms_level: string | null;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  payload: unknown,
): { valid: true; data: ReportRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.program_id || typeof p.program_id !== 'string') {
    return { valid: false, error: 'program_id is required and must be a string' };
  }

  if (p.semester_id !== undefined && typeof p.semester_id !== 'string') {
    return { valid: false, error: 'semester_id must be a string when provided' };
  }

  const validTemplates: ReportTemplate[] = ['ABET', 'HEC', 'Generic'];
  if (!p.template || typeof p.template !== 'string' || !validTemplates.includes(p.template as ReportTemplate)) {
    return { valid: false, error: `template is required and must be one of: ${validTemplates.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      program_id: p.program_id as string,
      semester_id: p.semester_id as string | undefined,
      template: p.template as ReportTemplate,
      chart_images: (p.chart_images as Record<string, string>) ?? undefined,
      email_to: typeof p.email_to === 'string' ? p.email_to : undefined,
    },
  };
}

// ─── Attainment Level Classification ────────────────────────────────────────

function classifyAttainment(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Satisfactory';
  if (score >= 50) return 'Developing';
  return 'Not Yet';
}

// ─── Bloom's Distribution Counter ───────────────────────────────────────────

function countBloomsDistribution(outcomes: OutcomeRow[]): Record<string, number> {
  const dist: Record<string, number> = {
    Remembering: 0,
    Understanding: 0,
    Applying: 0,
    Analyzing: 0,
    Evaluating: 0,
    Creating: 0,
  };
  for (const o of outcomes) {
    if (o.blooms_level && o.type === 'CLO') {
      const level = o.blooms_level.charAt(0).toUpperCase() + o.blooms_level.slice(1).toLowerCase();
      if (level in dist) dist[level]++;
    }
  }
  return dist;
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

function generatePDF(
  template: ReportTemplate,
  programName: string,
  semesterName: string | null,
  ploData: Array<{ title: string; avgAttainment: number; evidenceCount: number; level: string }>,
  iloData: Array<{ title: string; avgAttainment: number; evidenceCount: number; level: string }>,
  bloomsDist: Record<string, number>,
  chartImages: Record<string, string> | undefined,
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Accreditation Report', 14, 16);
  doc.setFontSize(10);
  doc.text(`Template: ${template}`, 14, 24);
  doc.text(`Program: ${programName}`, 14, 30);
  if (semesterName) {
    doc.text(`Semester: ${semesterName}`, pageWidth / 2, 30);
  }
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 60, 24);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  let yPos = 45;

  // ── PLO Attainment Table ────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.text('Program Learning Outcome (PLO) Attainment', 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['PLO', 'Avg Attainment %', 'Evidence Count', 'Level']],
    body: ploData.map((row) => [
      row.title,
      row.avgAttainment.toFixed(1),
      String(row.evidenceCount),
      row.level,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] },
    styles: { fontSize: 8 },
  });

  yPos = doc.lastAutoTable?.finalY ?? yPos + 40;
  yPos += 12;

  // ── ILO Attainment Table ────────────────────────────────────────────────
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(14);
  doc.text('Institutional Learning Outcome (ILO) Attainment', 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['ILO', 'Avg Attainment %', 'Evidence Count', 'Level']],
    body: iloData.map((row) => [
      row.title,
      row.avgAttainment.toFixed(1),
      String(row.evidenceCount),
      row.level,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });

  yPos = doc.lastAutoTable?.finalY ?? yPos + 40;
  yPos += 12;

  // ── Bloom's Distribution Table ──────────────────────────────────────────
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(14);
  doc.text("Bloom's Taxonomy Distribution (CLOs)", 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['Level', 'CLO Count']],
    body: Object.entries(bloomsDist).map(([level, count]) => [level, String(count)]),
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 8 },
  });

  yPos = doc.lastAutoTable?.finalY ?? yPos + 40;
  yPos += 12;

  // ── Chart Images (pre-rendered from client) ─────────────────────────────
  if (chartImages) {
    for (const [label, base64] of Object.entries(chartImages)) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.text(label, 14, yPos);
      yPos += 4;
      try {
        doc.addImage(base64, 'PNG', 14, yPos, 180, 80);
        yPos += 88;
      } catch {
        doc.setFontSize(8);
        doc.text(`[Chart image could not be rendered: ${label}]`, 14, yPos);
        yPos += 8;
      }
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} — Edeviser Accreditation Report`,
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

    const { program_id, semester_id, template, chart_images, email_to } = validation.data;

    // ── Fetch program info ────────────────────────────────────────────────
    const { data: program, error: programErr } = await supabase
      .from('programs')
      .select('id, name, code, institution_id')
      .eq('id', program_id)
      .maybeSingle();

    if (programErr || !program) {
      return new Response(
        JSON.stringify({ error: 'Program not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch semester info (optional) ────────────────────────────────────
    let semesterName: string | null = null;
    if (semester_id) {
      const { data: semester } = await supabase
        .from('semesters')
        .select('name')
        .eq('id', semester_id)
        .maybeSingle();
      semesterName = semester?.name ?? null;
    }

    // ── Fetch courses in program ──────────────────────────────────────────
    let courseQuery = supabase
      .from('courses')
      .select('id')
      .eq('program_id', program_id);

    if (semester_id) {
      courseQuery = courseQuery.eq('semester_id', semester_id);
    }

    const { data: courses } = await courseQuery;
    const courseIds = (courses ?? []).map((c: { id: string }) => c.id);

    // ── Fetch all outcomes for the program's institution ──────────────────
    const { data: outcomes } = await supabase
      .from('learning_outcomes')
      .select('id, title, type, blooms_level')
      .eq('institution_id', program.institution_id);

    const allOutcomes = (outcomes ?? []) as OutcomeRow[];
    const ploOutcomes = allOutcomes.filter((o) => o.type === 'PLO');
    const iloOutcomes = allOutcomes.filter((o) => o.type === 'ILO');

    // ── Fetch outcome_attainment data ─────────────────────────────────────
    let attainmentQuery = supabase
      .from('outcome_attainment')
      .select('outcome_id, scope, score_percent, student_id, course_id');

    if (courseIds.length > 0) {
      attainmentQuery = attainmentQuery.in('course_id', courseIds);
    }

    const { data: attainmentData } = await attainmentQuery;
    const attainment = (attainmentData ?? []) as AttainmentRow[];

    // ── Aggregate PLO attainment ──────────────────────────────────────────
    const ploAgg = ploOutcomes.map((plo) => {
      const records = attainment.filter(
        (a) => a.outcome_id === plo.id && a.scope === 'PLO',
      );
      const avg =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.score_percent, 0) / records.length
          : 0;
      return {
        title: plo.title,
        avgAttainment: avg,
        evidenceCount: records.length,
        level: classifyAttainment(avg),
      };
    });

    // ── Aggregate ILO attainment ──────────────────────────────────────────
    const iloAgg = iloOutcomes.map((ilo) => {
      const records = attainment.filter(
        (a) => a.outcome_id === ilo.id && a.scope === 'ILO',
      );
      const avg =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.score_percent, 0) / records.length
          : 0;
      return {
        title: ilo.title,
        avgAttainment: avg,
        evidenceCount: records.length,
        level: classifyAttainment(avg),
      };
    });

    // ── Bloom's distribution ──────────────────────────────────────────────
    const bloomsDist = countBloomsDistribution(allOutcomes);

    // ── Generate PDF ──────────────────────────────────────────────────────
    const pdfBytes = generatePDF(
      template,
      program.name,
      semesterName,
      ploAgg,
      iloAgg,
      bloomsDist,
      chart_images,
    );

    // ── Upload to Supabase Storage ────────────────────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `reports/${program.code}_${template}_${timestamp}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) {
      // Try creating the bucket if it doesn't exist
      if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
        await supabase.storage.createBucket('reports', { public: false });
        const { error: retryErr } = await supabase.storage
          .from('reports')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false,
          });
        if (retryErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to upload report', detail: retryErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to upload report', detail: uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Generate signed download URL ──────────────────────────────────────
    const { data: signedUrl, error: signErr } = await supabase.storage
      .from('reports')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signErr || !signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL', detail: signErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Optional email delivery ───────────────────────────────────────────
    if (email_to) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'Edeviser <noreply@edeviser.com>',
              to: email_to,
              subject: `Accreditation Report — ${program.name} (${template})`,
              html: `
                <h2>Accreditation Report Generated</h2>
                <p><strong>Program:</strong> ${program.name}</p>
                <p><strong>Template:</strong> ${template}</p>
                ${semesterName ? `<p><strong>Semester:</strong> ${semesterName}</p>` : ''}
                <p><strong>Generated:</strong> ${new Date().toISOString().slice(0, 10)}</p>
                <p><a href="${signedUrl.signedUrl}">Download Report (link expires in 1 hour)</a></p>
              `,
            }),
          });
        }
      } catch (emailErr) {
        console.error('Email delivery failed (non-blocking):', emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl.signedUrl,
        file_name: fileName,
        program_name: program.name,
        template,
        semester: semesterName,
        plo_count: ploAgg.length,
        ilo_count: iloAgg.length,
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
