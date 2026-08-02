import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shimmer } from "@/design-system";
import { usePrograms } from "@/hooks/usePrograms";
import { useSemesters } from "@/hooks/useSemesters";
import { useProgramAccreditations } from "@/hooks/useInstitutionSettings";
import {
  useGenerateReport,
  type ReportTemplate,
} from "@/hooks/useAccreditationReport";
import { toast } from "sonner";
import { FileText, Download, Mail, Loader2, CheckCircle2 } from "lucide-react";
import {
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
} from "@/design-system";

// ─── Template options ───────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: Array<{
  value: ReportTemplate;
  label: string;
  description: string;
}> = [
  {
    value: "ABET",
    label: "ABET",
    description: "Accreditation Board for Engineering and Technology",
  },
  {
    value: "HEC",
    label: "HEC",
    description: "Higher Education Commission-aligned structure",
  },
  {
    value: "Generic",
    label: "Generic",
    description: "General accreditation report format",
  },
];

/** PLO naming conventions per accreditation body */
const PLO_NAMING: Record<string, string> = {
  ABET: "Student Outcomes",
  HEC: "PLOs",
  QQA: "Programme Learning Outcomes",
  NCAAA: "Programme Learning Outcomes",
  AACSB: "Learning Goals",
  Generic: "PLOs",
};

// ─── Report Generator Page ──────────────────────────────────────────────────

const ReportGeneratorPage = () => {
  const { data: programsResult, isLoading: programsLoading } = usePrograms({
    pageSize: 100,
  });
  const { data: semesters, isLoading: semestersLoading } = useSemesters();
  const generateMutation = useGenerateReport();

  const [programId, setProgramId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [template, setTemplate] = useState<ReportTemplate>("Generic");
  const [emailTo, setEmailTo] = useState("");
  const [lastResult, setLastResult] = useState<{
    download_url: string;
    file_name: string;
    program_name: string;
    template: ReportTemplate;
    semester: string | null;
    plo_count: number;
    ilo_count: number;
  } | null>(null);

  const programs = programsResult?.data ?? [];

  // Fetch accreditations for the selected program to enable body-specific reports
  const { data: programAccreditations } = useProgramAccreditations(
    programId || undefined
  );

  // Auto-select template based on program's accreditation body
  const handleProgramChange = (id: string) => {
    setProgramId(id);
    // If the program has accreditations, suggest the first body's template
    if (programAccreditations && programAccreditations.length > 0) {
      const first = programAccreditations[0];
      if (first && ["ABET", "HEC"].includes(first.accreditation_body)) {
        setTemplate(first.accreditation_body as ReportTemplate);
      }
    }
  };

  const ploLabel = PLO_NAMING[template] ?? "PLOs";

  const handleGenerate = () => {
    if (!programId) {
      toast.error("Please select a program");
      return;
    }

    setLastResult(null);

    generateMutation.mutate(
      {
        program_id: programId,
        semester_id:
          semesterId && semesterId !== "all" ? semesterId : undefined,
        template,
        email_to: emailTo || undefined,
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          toast.success("Report generated successfully");
          if (emailTo) {
            toast.success(`Report link sent to ${emailTo}`);
          }
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Report generation failed"
          );
        },
      }
    );
  };

  const handleDownload = () => {
    if (lastResult?.download_url) {
      window.open(lastResult.download_url, "_blank");
    }
  };

  const isLoading = programsLoading || semestersLoading;

  return (
    <div className={adminPageClass}>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Accreditation Reports
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Generate evidence-ready programme reports from live attainment data.
        </p>
      </div>

      <div className={`${adminCardClass} overflow-hidden`}>
        <div
          className="flex items-center justify-between gap-3 border-b border-white/20 px-4 py-4 text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex size-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-base"
              aria-hidden="true"
            >
              📄
            </span>
            <h2 className="text-sm font-black text-white">Generate Report</h2>
          </div>
          <AdminStatusPill tone="slate">Live data</AdminStatusPill>
        </div>
        <div className="space-y-5 p-4 md:p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Program Selector */}
              <div className="space-y-2">
                <Label htmlFor="program-select">Program</Label>
                <Select value={programId} onValueChange={handleProgramChange}>
                  <SelectTrigger id="program-select" className="bg-white">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                    {programs.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No programs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester Selector */}
              <div className="space-y-2">
                <Label htmlFor="semester-select">Semester (optional)</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger id="semester-select" className="bg-white">
                    <SelectValue placeholder="All semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All semesters</SelectItem>
                    {(semesters ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selector */}
              <div className="space-y-2">
                <Label htmlFor="template-select">Report Template</Label>
                <Select
                  value={template}
                  onValueChange={(v) => setTemplate(v as ReportTemplate)}
                >
                  <SelectTrigger id="template-select" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-gray-500 ms-2">
                          — {t.description}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programAccreditations && programAccreditations.length > 0 && (
                  <p className="text-xs text-gray-500">
                    This program has accreditations:{" "}
                    {programAccreditations
                      .map((a) => a.accreditation_body)
                      .join(", ")}
                    . Using &quot;{ploLabel}&quot; naming convention.
                  </p>
                )}
              </div>

              {/* Email Delivery (optional) */}
              <div className="space-y-2">
                <Label htmlFor="email-input">Email delivery (optional)</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="recipient@institution.edu"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  If provided, a download link will be emailed after generation.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !programId}
                variant="tactile"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generateMutation.isPending
                  ? "Generating..."
                  : "Generate Report"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Result Card */}
      {lastResult && (
        <div className={`${adminCardClass} overflow-hidden`}>
          <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-800">
            <CheckCircle2 className="size-5" />
            <h2 className="text-base font-black tracking-tight">
              Report Ready
            </h2>
          </div>
          <div className="space-y-4 p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Program
                </p>
                <p className="font-semibold mt-1">{lastResult.program_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Template
                </p>
                <p className="font-semibold mt-1">{lastResult.template}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  {PLO_NAMING[lastResult.template] ?? "PLOs"}
                </p>
                <p className="font-semibold mt-1">{lastResult.plo_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  ILOs
                </p>
                <p className="font-semibold mt-1">{lastResult.ilo_count}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleDownload} variant="tactile">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {lastResult.semester && (
                <span className="text-xs text-gray-500">
                  Semester: {lastResult.semester}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGeneratorPage;
