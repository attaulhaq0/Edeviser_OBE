// =============================================================================
// StudentTranscriptPage — official academic transcript (net-new screen)
// =============================================================================
// Built from the prototype design system (`@/design-system`): PageHeader +
// HeroCard + SectionCard + PCard + Button. Surfaces the `generate-transcript`
// edge function (via `useGenerateTranscript`) — generate + download the official
// PDF. Identity comes from auth; on-screen GPA/grade table deferred (R17).
// =============================================================================

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Download, FileText, GraduationCap, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button, HeroCard, PageHeader, PCard, SectionCard } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useGenerateTranscript } from "@/hooks/useTranscript";

const StudentTranscriptPage = () => {
  const { t } = useTranslation("common");
  const { user, profile } = useAuth();
  const generate = useGenerateTranscript();

  const studentId = user?.id ?? null;
  const fullName = profile?.full_name ?? "";

  const handleGenerate = () => {
    if (!studentId) return;
    generate.mutate(
      { student_id: studentId },
      {
        onSuccess: (result) => {
          const link = document.createElement("a");
          link.href = result.download_url;
          link.download = result.file_name || "transcript.pdf";
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success(t("transcript.ready", "Transcript ready to download"));
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t("transcript.error", "Could not generate transcript")
          );
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("transcript.title", "Transcript")} />

      {/* Identity hero */}
      <HeroCard ariaLabel={t("transcript.identity", "Student identity")}>
        <div className="flex items-center gap-4 p-6">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10"
            aria-hidden="true"
          >
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight">
              {fullName || t("transcript.student", "Student")}
            </h2>
            {studentId && (
              <p className="text-sm text-white/70">
                {t("transcript.studentId", "Student ID")}:{" "}
                <span className="font-semibold uppercase tracking-wide">
                  {studentId.slice(0, 8)}
                </span>
              </p>
            )}
          </div>
        </div>
      </HeroCard>

      {/* Official transcript — generate + download */}
      <SectionCard
        icon={FileText}
        title={t("transcript.officialTitle", "Official transcript")}
      >
        <p className="text-sm text-gray-500">
          {t(
            "transcript.officialDesc",
            "Generates an official, watermarked PDF with your full academic record — accepted by universities and employers."
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || !studentId}
            className="min-h-11 text-white transition-transform duration-100 active:scale-95"
            style={{ background: "var(--brand-gradient)" }}
            data-testid="transcript-generate"
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {t("transcript.download", "Download PDF")}
          </Button>
        </div>

        {generate.isPending && (
          <p className="text-xs text-gray-400" role="status">
            {t("transcript.generating", "Generating your official transcript…")}
          </p>
        )}
        {generate.isError && (
          <p className="text-xs text-red-600" role="alert">
            {t(
              "transcript.error",
              "Could not generate transcript. Please try again."
            )}
          </p>
        )}
        {generate.isSuccess && generate.data && (
          <p className="text-xs text-gray-500">
            {t("transcript.readyPrefix", "Ready to download:")}{" "}
            <span className="font-semibold text-gray-700">
              {generate.data.file_name}
            </span>
          </p>
        )}
      </SectionCard>

      {/* Link to the attainment behind the grades */}
      <PCard className="p-6">
        <Link
          to="/student/progress"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {t(
            "transcript.seeAttainment",
            "See outcome attainment behind these grades"
          )}
        </Link>
      </PCard>
    </div>
  );
};

export default StudentTranscriptPage;
