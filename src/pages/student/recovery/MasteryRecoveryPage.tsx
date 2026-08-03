import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MasteryRecoveryPanel from "@/components/shared/MasteryRecoveryPanel";
import { useMasteryRecoveryStatus } from "@/hooks/useMasteryRecovery";
import { useAuth } from "@/hooks/useAuth";
import { useCLO } from "@/hooks/useCLOs";
import { Shimmer } from "@/design-system";

const MasteryRecoveryPage = () => {
  const { t } = useTranslation("student");
  const { courseId, cloId } = useParams<{ courseId: string; cloId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const { data: recovery, isLoading } = useMasteryRecoveryStatus(
    studentId,
    cloId ?? ""
  );
  const clo = useCLO(cloId);

  if (isLoading || clo.isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Shimmer className="h-10 w-48" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!recovery) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/student/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("recoveryPath.backToDashboard", "Back to Dashboard")}
          </Button>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
          {t(
            "recoveryPath.empty",
            "No active recovery pathway was found for this outcome."
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/student/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("recoveryPath.backToDashboard", "Back to Dashboard")}
        </Button>
      </Link>

      <MasteryRecoveryPanel
        recoveryId={recovery.id}
        studentId={studentId}
        cloId={cloId ?? ""}
        cloTitle={
          clo.data?.title ??
          t("recoveryPath.unknownOutcome", "Learning outcome")
        }
        courseId={courseId ?? ""}
        onRetryUnlocked={() => {
          navigate(`/student/courses/${courseId ?? ""}`);
        }}
      />
    </div>
  );
};

export default MasteryRecoveryPage;
