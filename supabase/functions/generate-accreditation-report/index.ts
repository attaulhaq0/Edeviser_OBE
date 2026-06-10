import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2";
import autoTable from "https://esm.sh/jspdf-autotable@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type ReportTemplate = "ABET" | "HEC" | "QQA" | "NCAAA" | "AACSB" | "Generic";

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
  attainment_percent: number;
  student_id: string | null;
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
  payload: unknown
): { valid: true; data: ReportRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const p = payload as Record<string, unknown>;

  if (!p.program_id || typeof p.program_id !== "string") {
    return {
      valid: false,
      error: "program_id is required and must be a string",
    };
  }

  if (p.semester_id !== undefined && typeof p.semester_id !== "string") {
    return {
      valid: false,
      error: "semester_id must be a string when provided",
    };
  }

  const validTemplates: ReportTemplate[] = [
    "ABET",
    "HEC",
    "QQA",
    "NCAAA",
    "AACSB",
    "Generic",
  ];
  if (
    !p.template ||
    typeof p.template !== "string" ||
    !validTemplates.includes(p.template as ReportTemplate)
  ) {
    return {
      valid: false,
      error: `template is required and must be one of: ${validTemplates.join(
        ", "
      )}`,
    };
  }

  return {
    valid: true,
    data: {
      program_id: p.program_id as string,
      semester_id: p.semester_id as string | undefined,
      template: p.template as ReportTemplate,
      chart_images: (p.chart_images as Record<string, string>) ?? undefined,
      email_to: typeof p.email_to === "string" ? p.email_to : undefined,
    },
  };
}

// ─── Attainment Level Classification ────────────────────────────────────────

function classifyAttainment(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Satisfactory";
  if (score >= 50) return "Developing";
  return "Not Yet";
}

// ─── Bloom's Distribution Counter ───────────────────────────────────────────

function countBloomsDistribution(
  outcomes: OutcomeRow[]
): Record<string, number> {
  const dist: Record<string, number> = {
    Remembering: 0,
    Understanding: 0,
    Applying: 0,
    Analyzing: 0,
    Evaluating: 0,
    Creating: 0,
  };
  for (const o of outcomes) {
    if (o.blooms_level && o.type === "CLO") {
      const level =
        o.blooms_level.charAt(0).toUpperCase() +
        o.blooms_level.slice(1).toLowerCase();
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
  ploData: Array<{
    title: string;
    avgAttainment: number;
    evidenceCount: number;
    level: string;
  }>,
  iloData: Array<{
    title: string;
    avgAttainment: number;
    evidenceCount: number;
    level: string;
  }>,
  bloomsDist: Record<string, number>,
  chartImages: Record<string, string> | undefined,
  surveyResponseCount: number,
  cqiPlans: Array<{
    id: string;
    outcome_id: string;
    status: string;
    baseline_attainment: number | null;
    target_attainment: number | null;
    result_attainment: number | null;
  }>,
  sections: Array<{ id: string; section_code: string; course_id: string }>,
  gaData: Array<{
    name: string;
    description: string | null;
    attainment: number;
    mappedILOs: number;
  }>,
  competencyData: Array<{
    framework: string;
    totalIndicators: number;
    mappedIndicators: number;
    unmappedIndicators: number;
  }>
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Accreditation Report", 14, 16);
  doc.setFontSize(10);
  doc.text(`Template: ${template}`, 14, 24);
  doc.text(`Program: ${programName}`, 14, 30);
  if (semesterName) {
    doc.text(`Semester: ${semesterName}`, pageWidth / 2, 30);
  }
  doc.text(
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    pageWidth - 60,
    24
  );

  // Reset text color
  doc.setTextColor(0, 0, 0);
  let yPos = 45;

  // ── PLO Attainment Table ────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.text("Program Learning Outcome (PLO) Attainment", 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [["PLO", "Avg Attainment %", "Evidence Count", "Level"]],
    body: ploData.map((row) => [
      row.title,
      row.avgAttainment.toFixed(1),
      String(row.evidenceCount),
      row.level,
    ]),
    theme: "grid",
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
  doc.text("Institutional Learning Outcome (ILO) Attainment", 14, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [["ILO", "Avg Attainment %", "Evidence Count", "Level"]],
    body: iloData.map((row) => [
      row.title,
      row.avgAttainment.toFixed(1),
      String(row.evidenceCount),
      row.level,
    ]),
    theme: "grid",
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
    head: [["Level", "CLO Count"]],
    body: Object.entries(bloomsDist).map(([level, count]) => [
      level,
      String(count),
    ]),
    theme: "grid",
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 8 },
  });

  yPos = doc.lastAutoTable?.finalY ?? yPos + 40;
  yPos += 12;

  // ── Indirect Assessment: Survey Results (Task 62.4 / 77.1) ──────────
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(14);
  doc.text("Indirect Assessment — Survey Results", 14, yPos);
  yPos += 6;
  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: [
      ["Total Survey Responses", String(surveyResponseCount)],
      ["Assessment Type", "Indirect (Student/Graduate/Employer Surveys)"],
    ],
    theme: "grid",
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8 },
  });
  yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
  yPos += 12;

  // ── CQI Action Plans — Closing the Loop (Task 63.4 / 77.2) ─────────
  if (cqiPlans.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text(
      "Continuous Quality Improvement (CQI) — Closing the Loop",
      14,
      yPos
    );
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [["Outcome ID", "Status", "Baseline %", "Target %", "Result %"]],
      body: cqiPlans.map((p) => [
        p.outcome_id.slice(0, 8),
        p.status,
        p.baseline_attainment?.toFixed(1) ?? "—",
        p.target_attainment?.toFixed(1) ?? "—",
        p.result_attainment?.toFixed(1) ?? "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
    yPos += 12;
  }

  // ── Per-Section Summary (Task 77.4) ─────────────────────────────────
  if (sections.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Section Summary", 14, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [["Section Code", "Course ID"]],
      body: sections.map((s) => [s.section_code, s.course_id.slice(0, 8)]),
      theme: "grid",
      headStyles: { fillColor: [100, 116, 139] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
    yPos += 12;
  }

  // ── Graduate Attribute Attainment Summary (Task 113.4) ────────────────
  if (gaData.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Graduate Attribute Attainment", 14, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [
        ["Attribute", "Description", "Attainment %", "Level", "Mapped ILOs"],
      ],
      body: gaData.map((ga) => [
        ga.name,
        ga.description ?? "—",
        ga.attainment.toFixed(1),
        classifyAttainment(ga.attainment),
        String(ga.mappedILOs),
      ]),
      theme: "grid",
      headStyles: { fillColor: [168, 85, 247] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
    yPos += 12;
  }

  // ── Competency Framework Alignment Summary (Task 115.5) ─────────────
  if (competencyData.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Competency Framework Alignment", 14, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [
        ["Framework", "Total Indicators", "Mapped", "Unmapped", "Coverage %"],
      ],
      body: competencyData.map((cf) => [
        cf.framework,
        String(cf.totalIndicators),
        String(cf.mappedIndicators),
        String(cf.unmappedIndicators),
        cf.totalIndicators > 0
          ? ((cf.mappedIndicators / cf.totalIndicators) * 100).toFixed(1)
          : "0.0",
      ]),
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      styles: { fontSize: 8 },
    });
    yPos = doc.lastAutoTable?.finalY ?? yPos + 30;
    yPos += 12;
  }

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
        doc.addImage(base64, "PNG", 14, yPos, 180, 80);
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
      { align: "center" }
    );
  }

  return doc.output("arraybuffer") as Uint8Array;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require admin or coordinator ───────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Role + institution live in the profiles table, NOT the JWT (app_metadata
    // is empty on this project). Resolve them server-side from profiles by the
    // caller's id, mirroring the already-deployed ai-feedback-draft pattern.
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, institution_id")
      .eq("id", user.id)
      .maybeSingle();
    const callerRole =
      (callerProfile?.role as string) ??
      user.app_metadata?.role ??
      user.user_metadata?.role ??
      "";
    const callerInstitutionId =
      (callerProfile?.institution_id as string) ??
      user.app_metadata?.institution_id ??
      user.user_metadata?.institution_id ??
      "";
    void callerInstitutionId; // resolved for parity with shared helper; report scopes by program.institution_id
    if (!["admin", "coordinator"].includes(callerRole)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: admin or coordinator role required",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = adminClient;

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { program_id, semester_id, template, chart_images, email_to } =
      validation.data;

    // ── Fetch program info ────────────────────────────────────────────────
    const { data: program, error: programErr } = await supabase
      .from("programs")
      .select("id, name, code, institution_id")
      .eq("id", program_id)
      .maybeSingle();

    if (programErr || !program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch semester info (optional) ────────────────────────────────────
    let semesterName: string | null = null;
    if (semester_id) {
      const { data: semester, error: semesterErr } = await supabase
        .from("semesters")
        .select("name")
        .eq("id", semester_id)
        .maybeSingle();
      if (semesterErr) throw semesterErr;
      semesterName = semester?.name ?? null;
    }

    // ── Fetch courses in program ──────────────────────────────────────────
    let courseQuery = supabase
      .from("courses")
      .select("id")
      .eq("program_id", program_id);

    if (semester_id) {
      courseQuery = courseQuery.eq("semester_id", semester_id);
    }

    const { data: courses, error: coursesErr } = await courseQuery;
    if (coursesErr) throw coursesErr;
    const courseIds = (courses ?? []).map((c: { id: string }) => c.id);

    // ── Fetch all outcomes for the program's institution ──────────────────
    const { data: outcomes, error: outcomesErr } = await supabase
      .from("learning_outcomes")
      .select("id, title, type, blooms_level")
      .eq("institution_id", program.institution_id);
    if (outcomesErr) throw outcomesErr;

    const allOutcomes = (outcomes ?? []) as OutcomeRow[];
    const ploOutcomes = allOutcomes.filter((o) => o.type === "PLO");
    const iloOutcomes = allOutcomes.filter((o) => o.type === "ILO");

    // ── Fetch outcome_attainment data ─────────────────────────────────────
    // PLO/ILO attainment lives at the live scopes `program` / `institution`
    // (NOT the pre-migration `PLO`/`ILO` scopes) keyed by `outcome_id`, exactly
    // as useAdminDashboard derives it. The rows are not course-scoped, so we
    // select by scope and aggregate by outcome_id rather than filtering by course.
    const { data: attainmentData, error: attainmentErr } = await supabase
      .from("outcome_attainment")
      .select("outcome_id, scope, attainment_percent, student_id, course_id")
      .in("scope", ["program", "institution"]);
    if (attainmentErr) throw attainmentErr;
    const attainment = (attainmentData ?? []) as AttainmentRow[];

    // ── Aggregate PLO attainment ──────────────────────────────────────────
    const ploAgg = ploOutcomes.map((plo) => {
      const records = attainment.filter((a) => a.outcome_id === plo.id);
      const avg =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.attainment_percent, 0) /
            records.length
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
      const records = attainment.filter((a) => a.outcome_id === ilo.id);
      const avg =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.attainment_percent, 0) /
            records.length
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

    // ── Fetch survey results as indirect assessment (Task 62.4 / 77.1) ──
    const { data: surveyIdRows, error: surveysErr } = await supabase
      .from("surveys")
      .select("id")
      .eq("institution_id", program.institution_id);
    if (surveysErr) throw surveysErr;
    const { data: surveyRows, error: surveyRespErr } = await supabase
      .from("survey_responses")
      .select("survey_id, responses")
      .in(
        "survey_id",
        (surveyIdRows ?? []).map((s: { id: string }) => s.id)
      );
    if (surveyRespErr) throw surveyRespErr;
    const surveyCount = surveyRows?.length ?? 0;

    // ── Fetch CQI action plans (Task 63.4 / 77.2) ──────────────────────
    const { data: cqiRows, error: cqiErr } = await supabase
      .from("cqi_action_plans")
      .select(
        "id, outcome_id, status, baseline_attainment, target_attainment, result_attainment"
      )
      .eq("program_id", program_id);
    if (cqiErr) throw cqiErr;
    const cqiPlans = (cqiRows ?? []) as Array<{
      id: string;
      outcome_id: string;
      status: string;
      baseline_attainment: number | null;
      target_attainment: number | null;
      result_attainment: number | null;
    }>;

    // ── Fetch per-section attainment (Task 77.4) ────────────────────────
    const { data: sectionRows, error: sectionsErr } = await supabase
      .from("course_sections")
      .select("id, section_code, course_id")
      .in("course_id", courseIds.length > 0 ? courseIds : ["__none__"]);
    if (sectionsErr) throw sectionsErr;
    const sections = (sectionRows ?? []) as Array<{
      id: string;
      section_code: string;
      course_id: string;
    }>;

    // ── Fetch Graduate Attribute data (Task 113.4) ──────────────────────
    const { data: gaRows, error: gaErr } = await supabase
      .from("graduate_attributes")
      .select("id, name, description")
      .eq("institution_id", program.institution_id);
    if (gaErr) throw gaErr;
    const gaData: Array<{
      name: string;
      description: string | null;
      attainment: number;
      mappedILOs: number;
    }> = [];
    for (const ga of (gaRows ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
    }>) {
      const { data: gaMappings, error: gaMapErr } = await supabase
        .from("graduate_attribute_mappings")
        .select("ilo_id, weight")
        .eq("graduate_attribute_id", ga.id);
      if (gaMapErr) throw gaMapErr;
      const mappings = (gaMappings ?? []) as Array<{
        ilo_id: string;
        weight: number;
      }>;
      let weightedSum = 0;
      let totalWeight = 0;
      for (const m of mappings) {
        const iloAtt = iloAgg.find(
          (i) => allOutcomes.find((o) => o.id === m.ilo_id)?.title === i.title
        );
        if (iloAtt) {
          weightedSum += iloAtt.avgAttainment * m.weight;
          totalWeight += m.weight;
        }
      }
      gaData.push({
        name: ga.name,
        description: ga.description,
        attainment: totalWeight > 0 ? weightedSum / totalWeight : 0,
        mappedILOs: mappings.length,
      });
    }

    // ── Fetch Competency Framework data (Task 115.5) ────────────────────
    const { data: cfRows, error: cfErr } = await supabase
      .from("competency_frameworks")
      .select("id, name")
      .eq("institution_id", program.institution_id);
    if (cfErr) throw cfErr;
    const competencyData: Array<{
      framework: string;
      totalIndicators: number;
      mappedIndicators: number;
      unmappedIndicators: number;
    }> = [];
    for (const cf of (cfRows ?? []) as Array<{ id: string; name: string }>) {
      const { data: indicators, error: indicatorsErr } = await supabase
        .from("competency_items")
        .select("id")
        .eq("framework_id", cf.id)
        .eq("level", "indicator");
      if (indicatorsErr) throw indicatorsErr;
      const indicatorIds = ((indicators ?? []) as Array<{ id: string }>).map(
        (i) => i.id
      );
      let mappedCount = 0;
      if (indicatorIds.length > 0) {
        const { count, error: mapCountErr } = await supabase
          .from("competency_outcome_mappings")
          .select("id", { count: "exact", head: true })
          .in("competency_item_id", indicatorIds);
        if (mapCountErr) throw mapCountErr;
        mappedCount = count ?? 0;
      }
      competencyData.push({
        framework: cf.name,
        totalIndicators: indicatorIds.length,
        mappedIndicators: Math.min(mappedCount, indicatorIds.length),
        unmappedIndicators: Math.max(0, indicatorIds.length - mappedCount),
      });
    }

    // ── Generate PDF ──────────────────────────────────────────────────────
    const pdfBytes = generatePDF(
      template,
      program.name,
      semesterName,
      ploAgg,
      iloAgg,
      bloomsDist,
      chart_images,
      surveyCount,
      cqiPlans,
      sections,
      gaData,
      competencyData
    );

    // ── Upload to Supabase Storage ────────────────────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // Institution-prefixed path: the first folder is the owning institution id
    // so the `reports` bucket can be RLS-scoped per tenant (see the
    // reports_institution_read storage policy). Falls back to "reports" only if
    // the program somehow has no institution (should not happen — program is
    // validated above).
    const institutionPrefix = program.institution_id ?? "reports";
    const fileName = `${institutionPrefix}/${program.code}_${template}_${timestamp}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      // The `reports` bucket is provisioned (private, institution-scoped RLS)
      // as part of the migration-history reconciliation deploy, so an upload
      // failure here is a genuine error rather than a missing bucket — surface
      // it directly instead of self-creating an unpoliced bucket at runtime.
      return new Response(
        JSON.stringify({
          error: "Failed to upload report",
          detail: uploadErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Generate signed download URL ──────────────────────────────────────
    const { data: signedUrl, error: signErr } = await supabase.storage
      .from("reports")
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signErr || !signedUrl) {
      return new Response(
        JSON.stringify({
          error: "Failed to generate download URL",
          detail: signErr?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Optional email delivery ───────────────────────────────────────────
    if (email_to) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Edeviser <noreply@edeviser.com>",
              to: email_to,
              subject: `Accreditation Report — ${program.name} (${template})`,
              html: `
                <h2>Accreditation Report Generated</h2>
                <p><strong>Program:</strong> ${program.name}</p>
                <p><strong>Template:</strong> ${template}</p>
                ${
                  semesterName
                    ? `<p><strong>Semester:</strong> ${semesterName}</p>`
                    : ""
                }
                <p><strong>Generated:</strong> ${new Date()
                  .toISOString()
                  .slice(0, 10)}</p>
                <p><a href="${
                  signedUrl.signedUrl
                }">Download Report (link expires in 1 hour)</a></p>
              `,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Email delivery failed (non-blocking):", emailErr);
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
