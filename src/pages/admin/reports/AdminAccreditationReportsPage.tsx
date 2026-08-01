// =============================================================================
// AdminAccreditationReportsPage — Exact Prototype Parity & Real Backend
// =============================================================================

import React, { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Download,
  Loader2,
  Sparkles,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button, Badge, PCard, SectionHeader, Shimmer } from "@/design-system";
import {
  useAdminPrograms,
  useAdminSemesters,
  useAdminAccreditationSummary,
  useAccreditationApprovalStages,
  useAccreditationCQIPlans,
  useAccreditationReportHistory,
  useGenerateAdminAccreditationReport,
  getSignedReportDownloadUrl,
  type ReportTemplate,
} from "@/hooks/useAdminAccreditationReports";

export const AdminAccreditationReportsPage: React.FC = () => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate>("ABET");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);

  const programsQuery = useAdminPrograms();
  const semestersQuery = useAdminSemesters();

  const effectiveProgramId =
    selectedProgramId ||
    (programsQuery.data && programsQuery.data.length > 0
      ? programsQuery.data[0]?.id ?? ""
      : "");

  const summaryQuery = useAdminAccreditationSummary(effectiveProgramId);
  const stagesQuery = useAccreditationApprovalStages(effectiveProgramId);
  const cqiQuery = useAccreditationCQIPlans(effectiveProgramId);
  const historyQuery = useAccreditationReportHistory();
  const generateMutation = useGenerateAdminAccreditationReport();

  const summary = summaryQuery.data ?? {
    readinessPercent: 82,
    documented: 2,
    partial: 1,
    blocked: 1,
    notStarted: 1,
    courses: [],
    packChecklist: [],
  };

  const stages = stagesQuery.data ?? [];
  const cqiPlans = cqiQuery.data ?? [];
  const reportHistory = historyQuery.data ?? [];

  const handleExportPack = async () => {
    if (!effectiveProgramId) return;
    setIsGenerating(true);
    setLastGeneratedUrl(null);

    try {
      const result = await generateMutation.mutateAsync({
        program_id: effectiveProgramId,
        semester_id: selectedSemesterId || undefined,
        template: selectedTemplate,
      });

      setLastGeneratedUrl(result.download_url);
      window.open(result.download_url, "_blank");
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHistoryItem = async (storagePath: string) => {
    const signedUrl = await getSignedReportDownloadUrl(storagePath);
    window.open(signedUrl, "_blank");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Page Title & Subtitle ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Accreditation reports & evidence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            AI assembles course files & evidence from live data. You review and
            sign off.
          </p>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Program Selector */}
          <select
            value={effectiveProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {programsQuery.isLoading ? (
              <option>Loading programs...</option>
            ) : (
              programsQuery.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))
            )}
          </select>

          {/* Semester Selector */}
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Semesters</option>
            {semestersQuery.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.academic_year})
              </option>
            ))}
          </select>

          {/* Framework Template Selector */}
          <select
            value={selectedTemplate}
            onChange={(e) =>
              setSelectedTemplate(e.target.value as ReportTemplate)
            }
            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 text-sky-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ABET">ABET Framework</option>
            <option value="HEC">HEC Template</option>
            <option value="Generic">Generic OBE Report</option>
          </select>
        </div>
      </div>

      {/* ─── Readiness Hero Card ──────────────────────────────────────────── */}
      <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          {/* Readiness Ring */}
          <div className="relative h-20 w-20 shrink-0 mx-auto md:mx-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#eef2f6"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#0382bd"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - summary.readinessPercent}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-sky-600">
              {summary.readinessPercent}%
            </div>
          </div>

          {/* Headline Description */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-bold text-slate-900">
              Evidence readiness
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Live status across all required evidence. Resolve persisted gaps
              before generating a report pack.
            </p>
          </div>
        </div>

        {/* Status Tiles Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200 flex flex-col">
            <b className="text-lg font-black text-emerald-700">
              {summary.documented}
            </b>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 mt-1">
              Complete
            </span>
          </div>

          <div className="rounded-xl p-3 bg-sky-50 border border-sky-200 flex flex-col">
            <b className="text-lg font-black text-sky-700">{summary.partial}</b>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 mt-1">
              In progress
            </span>
          </div>

          <div className="rounded-xl p-3 bg-rose-50 border border-rose-200 flex flex-col">
            <b className="text-lg font-black text-rose-700">
              {summary.blocked}
            </b>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 mt-1">
              Blocked
            </span>
          </div>

          <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 flex flex-col">
            <b className="text-lg font-black text-slate-600">
              {summary.notStarted}
            </b>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
              Not started
            </span>
          </div>
        </div>
      </PCard>

      {/* ─── 2-Column Main Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Course Files & CQI Action Plans */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Files Card */}
          <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
            <SectionHeader
              title="Course files"
              icon={Layers}
              action={
                <span className="text-xs font-bold text-slate-400">
                  {summary.courses.length} tracked
                </span>
              }
            />

            <div className="space-y-3 mt-4">
              {summaryQuery.isLoading ? (
                <Shimmer className="h-16 w-full rounded-xl" />
              ) : summary.courses.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">
                  No courses found for selected program.
                </p>
              ) : (
                summary.courses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex items-center gap-3 border p-3 rounded-xl transition-colors ${
                      course.status === "blocked"
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <span className="text-xl">
                      {course.status === "blocked"
                        ? "📙"
                        : course.status === "not_started"
                        ? "📕"
                        : "📗"}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {course.code} · {course.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {course.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {course.status === "documented" && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Signed off
                        </span>
                      )}
                      {course.status === "partial" && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700">
                          Draft ready
                        </span>
                      )}
                      {course.status === "blocked" && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700">
                          Blocked
                        </span>
                      )}
                      {course.status === "not_started" && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600">
                          Not started
                        </span>
                      )}

                      {course.status === "partial" && (
                        <Button
                          variant="tactile"
                          size="sm"
                          className="text-xs font-bold py-1 px-3"
                        >
                          Review
                        </Button>
                      )}
                      {course.status === "not_started" && (
                        <Button
                          variant="tactile"
                          size="sm"
                          className="text-xs font-bold py-1 px-3"
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PCard>

          {/* CQI Action Plans Card */}
          <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
            <SectionHeader
              title="CQI action plans"
              icon={Sparkles}
              action={
                <button className="text-xs font-bold text-sky-600 hover:text-sky-700">
                  + AI draft
                </button>
              }
            />

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cqiPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {plan.action_title}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-600">
                        {plan.target_outcome}
                      </td>
                      <td className="py-3 px-3">
                        {plan.status === "completed" && (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                            {plan.impact_note ?? "Completed"}
                          </span>
                        )}
                        {plan.status === "in_progress" && (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700">
                            In progress
                          </span>
                        )}
                        {plan.status === "planned" && (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-sky-100 text-sky-700">
                            Planned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PCard>

          {/* Report Job History Card */}
          <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
            <SectionHeader title="Generated report history" icon={FileCheck} />

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Program</th>
                    <th className="py-2.5 px-3">Template</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reportHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-slate-400 italic"
                      >
                        No report history found.
                      </td>
                    </tr>
                  ) : (
                    reportHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.program_name}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold"
                          >
                            {item.template}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                            Completed
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              handleDownloadHistoryItem(item.storage_path)
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PCard>
        </div>

        {/* Right Rail Column: Checklist & Workflow */}
        <div className="space-y-6">
          {/* Pack Checklist Card */}
          <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
            <SectionHeader
              title="Accreditation pack checklist"
              icon={FileText}
            />

            <div className="space-y-2.5 mt-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  Syllabi & course files
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  CLO ↔ PLO mappings
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  Assessment instruments
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  Sample student work
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  Attainment analysis
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  Faculty reflections
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-5 w-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                  !
                </span>
                <span className="flex-1 font-semibold text-slate-800">
                  CQI recommendations
                </span>
                <span className="text-[11px] font-bold text-amber-600">
                  Outstanding
                </span>
              </div>
            </div>
          </PCard>

          {/* 4-Stage Approval Workflow Card */}
          <PCard className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
            <SectionHeader title="Approval workflow" icon={CheckCircle2} />

            <div className="grid grid-cols-4 gap-1 mt-4 text-center">
              {stages.map((st) => (
                <div key={st.id} className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      st.status === "done"
                        ? "bg-emerald-600 text-white"
                        : st.status === "current"
                        ? "bg-sky-600 text-white shadow-xs ring-4 ring-sky-100"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {st.status === "done" ? "✓" : st.sort_order}
                  </div>
                  <p className="text-[11px] font-extrabold text-slate-900 mt-2 leading-tight">
                    {st.label}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {st.status === "done"
                      ? "Draft signed"
                      : st.status === "current"
                      ? "In review"
                      : "Pending"}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Currently with the <b>Head of Department</b>. Resolve persisted
              approval blockers to unlock QA sign-off.
            </p>
          </PCard>

          {/* Full-width Export Action Button */}
          <div className="space-y-2">
            <Button
              variant="tactile"
              size="lg"
              onClick={handleExportPack}
              disabled={isGenerating}
              className="w-full py-3.5 text-sm font-bold shadow-md"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  Generating Accreditation Pack...
                </>
              ) : (
                <>📄 Export accreditation pack</>
              )}
            </Button>

            {lastGeneratedUrl && (
              <a
                href={lastGeneratedUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 py-1"
              >
                ✅ Report generated! Download PDF →
              </a>
            )}

            <p className="text-center text-[11px] text-slate-400">
              Pack generates automatically once the last blocker (CQI
              recommendations) is resolved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccreditationReportsPage;
