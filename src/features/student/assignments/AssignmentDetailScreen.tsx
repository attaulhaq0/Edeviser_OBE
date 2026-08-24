import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import ErrorState from "@/components/shared/ErrorState";
import UploadProgress from "@/components/shared/UploadProgress";
import BloomsPill from "@/components/shared/BloomsPill";
import {
  Button,
  Badge,
  Input,
  PCard,
  SectionHeader,
  Shimmer,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useAssignment } from "@/hooks/useAssignments";
import { useAssignmentDifficultyBonus } from "@/hooks/useAdaptiveXP";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import {
  useCreateSubmission,
  useSubmissions,
  useUploadSubmissionFile,
} from "@/hooks/useSubmissions";
import { validateFile, FileValidationError } from "@/lib/fileUpload";
import { draftManager } from "@/lib/draftManager";
import { getDeadlineStatus } from "@/lib/submissionDeadline";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";
import { XP_SCHEDULE, LATE_SUBMISSION_XP } from "@/lib/xpSchedule";
import { logActivity } from "@/lib/activityLogger";
import { useOptimisticXP } from "@/hooks/useOptimisticXP";
import { getSignedUrl } from "@/lib/storageUrl";
import { captureAnalyticsEvent } from "@/lib/analyticsConsent";

const FILE_LIMIT_LABEL = "PDF, DOCX, PPTX, TXT up to 10MB";

const ASSIGNMENT_FACTS: Array<{
  icon: LucideIcon;
  labelKey: string;
}> = [
  { icon: Clock, labelKey: "assignments.detail.facts.due" },
  { icon: FileText, labelKey: "assignments.detail.facts.marks" },
  { icon: Award, labelKey: "assignments.detail.facts.reward" },
  { icon: ClipboardList, labelKey: "assignments.detail.facts.window" },
];

const AssignmentDetailScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("student");
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assignment = useAssignment(id);
  const courses = useStudentCourses(profile?.id);
  const submissions = useSubmissions({ assignmentId: id });
  const createSubmission = useCreateSubmission();
  const uploadFile = useUploadSubmissionFile();
  const { awardXPOptimistic } = useOptimisticXP();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "uploading" | "success" | "error"
  >("uploading");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftHint] = useState<string | null>(() => {
    const saved = draftManager.loadDraft<{
      fileName: string;
      fileSize: number;
    }>(`submission-draft-${id ?? "unknown"}`);
    return saved?.fileName ? saved.fileName : null;
  });
  const [submittedFileUrl, setSubmittedFileUrl] = useState<string | null>(null);
  const [submittedFileLoading, setSubmittedFileLoading] = useState(false);

  const assignmentData = assignment.data;
  const submissionRows = submissions.data?.data ?? [];
  const mySubmission =
    submissionRows.find((row) => row.profiles?.id === profile?.id) ?? null;

  const cloIds = assignmentData?.clo_weights?.map((item) => item.clo_id) ?? [];
  const difficultyBonus = useAssignmentDifficultyBonus(cloIds);
  const deadlineStatus = assignmentData
    ? getDeadlineStatus(
        assignmentData.due_date,
        assignmentData.late_window_hours
      )
    : null;

  useReadHabitTimer({
    pageType: "assignment_detail",
    pageId: id ?? "",
  });

  useEffect(() => {
    let active = true;

    const loadSignedUrl = async () => {
      if (!mySubmission?.file_url) {
        setSubmittedFileUrl(null);
        setSubmittedFileLoading(false);
        return;
      }

      setSubmittedFileLoading(true);
      const url = await getSignedUrl("submissions", mySubmission.file_url);
      if (!active) return;
      setSubmittedFileUrl(url);
      setSubmittedFileLoading(false);
    };

    void loadSignedUrl();

    return () => {
      active = false;
    };
  }, [mySubmission?.file_url]);

  const isLoading = assignment.isLoading || submissions.isLoading;
  const isUploading = uploadFile.isPending || createSubmission.isPending;

  const handleFileChange = (file: File | null | undefined) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      draftManager.clearDraft(`submission-draft-${id ?? "unknown"}`);
      return;
    }

    try {
      validateFile(file);
      setSelectedFile(file);
      draftManager.saveDraft(`submission-draft-${id ?? "unknown"}`, {
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (error) {
      if (error instanceof FileValidationError) {
        setFileError(error.message);
        setSelectedFile(null);
      } else {
        setFileError(
          t(
            "assignments.detail.fileValidationFailed",
            "File validation failed."
          )
        );
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const attemptUpload = async (retries: number): Promise<string> => {
    if (!selectedFile || !assignmentData) {
      throw new Error("Missing assignment or file");
    }

    try {
      setUploadProgress(15 + retries * 5);
      const result = await uploadFile.mutateAsync({
        file: selectedFile,
        assignmentId: assignmentData.id,
        institutionId: profile?.institution_id ?? "",
      });
      setUploadProgress(100);
      setUploadStatus("success");
      return result;
    } catch (error) {
      const isNetworkError =
        !navigator.onLine ||
        (error instanceof Error &&
          /network|fetch|timeout|offline/i.test(error.message));

      if (isNetworkError && retries < 3) {
        toast.info(
          t("assignments.detail.retryingUpload", {
            defaultValue: "Upload failed — retrying ({{count}}/3)…",
            count: retries + 1,
          })
        );
        await new Promise((resolve) =>
          window.setTimeout(resolve, 1_500 * (retries + 1))
        );
        return attemptUpload(retries + 1);
      }

      setUploadStatus("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!assignmentData || !selectedFile || !deadlineStatus) return;

    if (!deadlineStatus.canSubmit) {
      toast.error(
        t("assignments.deadlinePassed", "The submission deadline has passed.")
      );
      return;
    }

    setUploadProgress(0);
    setUploadStatus("uploading");
    setUploadError(null);

    try {
      const fileUrl = await attemptUpload(0);
      const payload = {
        assignment_id: assignmentData.id,
        file_url: fileUrl,
        is_late: deadlineStatus.isLate,
        institution_id: profile?.institution_id ?? "",
      };

      createSubmission.mutate(payload, {
        onSuccess: () => {
          captureAnalyticsEvent("assignment_submitted", {
            is_late: deadlineStatus.isLate,
          });
          setSelectedFile(null);
          draftManager.clearDraft(`submission-draft-${id ?? "unknown"}`);
          void submissions.refetch();
          toast.success(
            t("assignments.submissionConfirmed", "Submission confirmed!")
          );
          logActivity({
            student_id: profile?.id ?? "",
            event_type: "submission",
            metadata: {
              assignment_id: assignmentData.id,
              is_late: deadlineStatus.isLate,
            },
          });
          awardXPOptimistic({
            studentId: profile?.id ?? "",
            xpAmount: deadlineStatus.isLate
              ? LATE_SUBMISSION_XP
              : XP_SCHEDULE.submission,
            source: "submission",
            referenceId: assignmentData.id,
            note: deadlineStatus.isLate
              ? "Late submission"
              : "On-time submission",
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadStatus("error");
      setUploadError(message);
      toast.error(message);
    }
  };

  const retryUpload = () => {
    if (!selectedFile) return;
    void handleSubmit();
  };

  const courseLabel =
    assignmentData?.courses?.name ??
    courses.data?.find((course) => course.id === assignmentData?.course_id)
      ?.name ??
    t("assignments.detail.courseFallback", "Course");
  const dueLabel = assignmentData
    ? format(new Date(assignmentData.due_date), "MMM d, yyyy h:mm a")
    : "";
  const rewardXP = deadlineStatus?.isLate
    ? LATE_SUBMISSION_XP
    : XP_SCHEDULE.submission;

  if (isLoading && !assignmentData) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-8 w-44 rounded-2xl" />
        <Shimmer className="h-52 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Shimmer className="h-64 rounded-3xl" />
          <Shimmer className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (assignment.isError || submissions.isError) {
    return (
      <ErrorState
        title={t("assignments.detail.loadErrorTitle", "Assignment unavailable")}
        message={t(
          "assignments.detail.loadError",
          "We couldn't load this assignment. Please try again."
        )}
        onRetry={() => {
          void assignment.refetch();
          void submissions.refetch();
        }}
        retryLabel={t("common:buttons.retry", "Try again")}
      />
    );
  }

  if (!assignmentData) {
    return (
      <ErrorState
        title={t("assignments.detail.notFoundTitle", "Assignment not found")}
        message={t(
          "assignments.detail.notFound",
          "This assignment is not available anymore."
        )}
        onRetry={() => navigate("/student/assignments")}
        retryLabel={t(
          "assignments.detail.backToAssignments",
          "Back to assignments"
        )}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/student/assignments")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="me-1 size-4" />
          {t("assignments.detail.backToAssignments", "Back to assignments")}
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {courseLabel}
            {assignmentData.rubrics?.title
              ? ` · ${assignmentData.rubrics.title}`
              : ""}
          </p>
          <h1 className="truncate text-2xl font-black tracking-tight text-foreground">
            {assignmentData.title}
          </h1>
        </div>
      </div>

      <PCard className="overflow-hidden p-0">
        <div
          className="px-5 py-4"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80">
                {courseLabel}
              </p>
              <h2 className="truncate text-xl font-black tracking-tight text-white">
                {assignmentData.title}
              </h2>
            </div>
            <Badge className="rounded-full border-white/20 bg-white/15 px-3 py-1 text-[11px] text-white">
              {deadlineStatus?.timeRemaining ??
                t("assignments.detail.loading", "Loading")}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {assignmentData.description}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ASSIGNMENT_FACTS.map(({ icon: Icon, labelKey }) => {
              const value =
                labelKey === "assignments.detail.facts.due"
                  ? dueLabel
                  : labelKey === "assignments.detail.facts.marks"
                  ? `${assignmentData.total_marks}`
                  : labelKey === "assignments.detail.facts.reward"
                  ? `+${rewardXP} XP`
                  : deadlineStatus
                  ? deadlineStatus.window === "closed"
                    ? t("assignments.detail.closedWindow", "Closed")
                    : `${assignmentData.late_window_hours}h`
                  : "";

              return (
                <div
                  key={labelKey}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center"
                >
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-2 flex size-9 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                    {t(labelKey)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {assignmentData.clo_weights.length > 0 ? (
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-[11px]"
              >
                {t("assignments.detail.linkedClos", {
                  defaultValue: "{{count}} linked CLOs",
                  count: assignmentData.clo_weights.length,
                })}
              </Badge>
            ) : null}

            {difficultyBonus.data ? (
              <>
                <BloomsPill level={difficultyBonus.data.bloomsLevel} />
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[11px]"
                >
                  {t("assignments.detail.xpBonus", {
                    defaultValue: "{{multiplier}}x XP bonus",
                    multiplier: difficultyBonus.data.multiplier,
                  })}
                </Badge>
              </>
            ) : null}
          </div>
        </div>
      </PCard>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <PCard className="p-5">
            <SectionHeader
              icon={Upload}
              title={t("assignments.detail.submitTitle", "Submit your work")}
              description={t(
                "assignments.detail.submitDescription",
                "Upload your file, then submit it before the deadline window closes."
              )}
            />

            <div className="mt-4 space-y-4">
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
              />

              <button
                type="button"
                onClick={openFilePicker}
                className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Upload className="size-8 text-slate-400" />
                <span className="mt-3 text-sm font-semibold text-foreground">
                  {t(
                    "assignments.detail.tapToUpload",
                    "Tap to upload your file"
                  )}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {FILE_LIMIT_LABEL}
                </span>
              </button>

              {fileError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {fileError}
                </p>
              ) : null}

              {draftHint && !selectedFile ? (
                <p className="text-xs text-muted-foreground">
                  {t("assignments.detail.draftHint", {
                    defaultValue: "Previously selected: {{name}}",
                    name: draftHint,
                  })}
                </p>
              ) : null}

              {selectedFile ? (
                <UploadProgress
                  progress={uploadProgress}
                  fileName={selectedFile.name}
                  fileSize={selectedFile.size}
                  status={uploadStatus}
                  onRetry={uploadStatus === "error" ? retryUpload : undefined}
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="tactile"
                  onClick={() => void handleSubmit()}
                  disabled={
                    !selectedFile || isUploading || !deadlineStatus?.canSubmit
                  }
                >
                  {isUploading
                    ? t("assignments.detail.submitting", "Submitting...")
                    : t("assignments.submitAssignment", "Submit Assignment")}
                </Button>
                {selectedFile ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleFileChange(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="me-1 size-4" />
                    {t("assignments.detail.clearFile", "Clear file")}
                  </Button>
                ) : null}
              </div>

              {uploadError ? (
                <p className="text-sm text-red-600">{uploadError}</p>
              ) : null}

              {deadlineStatus?.window === "closed" ? (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="size-4" />
                  {t(
                    "assignments.deadlinePassed",
                    "The submission deadline has passed."
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {deadlineStatus?.window === "late_window"
                    ? t(
                        "assignments.detail.lateWindow",
                        "You can still submit during the late window."
                      )
                    : t(
                        "assignments.detail.openWindow",
                        "You can submit while the deadline window is open."
                      )}
                </p>
              )}
            </div>
          </PCard>

          <Link
            to="/student/tutor"
            className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PCard className="border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <Bot className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t(
                      "assignments.detail.tutorTitle",
                      "Need help before submitting?"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "assignments.detail.tutorHint",
                      "Ask the AI Tutor about the assignment topic."
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-teal-700">
                  {t("assignments.detail.ask", "Ask")}
                </span>
              </div>
            </PCard>
          </Link>
        </div>

        <div className="space-y-5">
          <PCard className="p-5">
            <SectionHeader
              icon={CheckCircle2}
              title={t("assignments.detail.statusTitle", "Your submission")}
              description={t(
                "assignments.detail.statusDescription",
                "Track the latest submission state for this assignment."
              )}
            />

            <div className="mt-4 space-y-3">
              {mySubmission ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {mySubmission.is_late
                          ? t(
                              "assignments.lateSubmission",
                              "This is a late submission."
                            )
                          : t(
                              "assignments.submissionConfirmed",
                              "Submission confirmed!"
                            )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(mySubmission.submitted_at),
                          {
                            addSuffix: true,
                          }
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={mySubmission.is_late ? "secondary" : "default"}
                      className="rounded-full px-3 py-1 text-[11px]"
                    >
                      {mySubmission.is_late
                        ? t("assignments.detail.late", "Late")
                        : t("assignments.detail.submitted", "Submitted")}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {submittedFileLoading ? (
                      <Badge
                        variant="outline"
                        className="rounded-full px-3 py-1 text-[11px]"
                      >
                        {t(
                          "assignments.detail.signing",
                          "Preparing file link..."
                        )}
                      </Badge>
                    ) : submittedFileUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={submittedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t(
                            "assignments.detail.viewSubmission",
                            "View submission"
                          )}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-muted-foreground">
                  {t(
                    "assignments.detail.noSubmission",
                    "You have not submitted this assignment yet."
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                    {t("assignments.detail.dueLabel", "Due")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {format(new Date(assignmentData.due_date), "PPP p")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                    {t("assignments.detail.windowLabel", "Late window")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {assignmentData.late_window_hours
                      ? t("assignments.detail.windowValue", {
                          defaultValue: "{{count}} hours",
                          count: assignmentData.late_window_hours,
                        })
                      : t("assignments.detail.none", "None")}
                  </p>
                </div>
              </div>
            </div>
          </PCard>

          <PCard className="p-5">
            <SectionHeader
              icon={Award}
              title={t("assignments.detail.bonusTitle", "Performance context")}
              description={t(
                "assignments.detail.bonusDescription",
                "The system uses linked CLO difficulty to tune rewards."
              )}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {difficultyBonus.data ? (
                <>
                  <BloomsPill level={difficultyBonus.data.bloomsLevel} />
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-[11px]"
                  >
                    {t("assignments.detail.bonusValue", {
                      defaultValue: "{{multiplier}}x XP bonus",
                      multiplier: difficultyBonus.data.multiplier,
                    })}
                  </Badge>
                </>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[11px]"
                >
                  {t("assignments.detail.noBonus", "No difficulty bonus")}
                </Badge>
              )}
            </div>
          </PCard>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetailScreen;
