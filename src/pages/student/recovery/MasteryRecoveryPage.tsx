import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MasteryRecoveryPanel from "@/components/shared/MasteryRecoveryPanel";
import { useMasteryRecoveryStatus } from "@/hooks/useMasteryRecovery";
import { useAuth } from "@/hooks/useAuth";
import Shimmer from "@/components/shared/Shimmer";

const MasteryRecoveryPage = () => {
  const { courseId, cloId } = useParams<{ courseId: string; cloId: string }>();
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const { data: recovery, isLoading } = useMasteryRecoveryStatus(
    studentId,
    cloId ?? ""
  );

  if (isLoading) {
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
            Back to Dashboard
          </Button>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
          No active recovery pathway found for this CLO.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/student/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <MasteryRecoveryPanel
        recoveryId={recovery.id}
        studentId={studentId}
        cloId={cloId ?? ""}
        cloTitle={cloId ?? "Unknown CLO"}
        courseId={courseId ?? ""}
        onRetryUnlocked={() => {
          window.location.href = `/student/dashboard`;
        }}
      />
    </div>
  );
};

export default MasteryRecoveryPage;
