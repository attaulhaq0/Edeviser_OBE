import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssignment } from '@/hooks/useAssignments';
import { useSubmissions, useCreateSubmission, useUploadSubmissionFile } from '@/hooks/useSubmissions';
import type { CreateSubmissionInput } from '@/hooks/useSubmissions';
import { validateFile, FileValidationError } from '@/lib/fileUpload';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Shimmer from '@/components/shared/Shimmer';
import UploadProgress from '@/components/shared/UploadProgress';
import ErrorState from '@/components/shared/ErrorState';
import { toast } from 'sonner';
import {
  ClipboardList,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { getDeadlineStatus } from '@/lib/submissionDeadline';
import { logActivity } from '@/lib/activityLogger';
import { draftManager } from '@/lib/draftManager';
import { useOptimisticXP } from '@/hooks/useOptimisticXP';
import { XP_SCHEDULE, LATE_SUBMISSION_XP } from '@/lib/xpSchedule';
import { useReadHabitTimer } from '@/hooks/useReadHabitTimer';
import { useAssignmentDifficultyBonus } from '@/hooks/useAdaptiveXP';
import BloomsPill from '@/components/shared/BloomsPill';
import { Sparkles } from 'lucide-react';

// ─── AssignmentDetailPage ───────────────────────────────────────────────────

const AssignmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id);
  const { data: paginatedSubmissions, isLoading: submissionsLoading } = useSubmissions({
    assignmentId: id,
  });
  const submissions = paginatedSubmissions?.data;
  const createSubmission = useCreateSubmission();
  const uploadFile = useUploadSubmissionFile();

  const { awardXPOptimistic } = useOptimisticXP();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | 'error'>('uploading');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isLoading = assignmentLoading || submissionsLoading;
  const isUploading = uploadFile.isPending;
  const isSubmitting = createSubmission.isPending;

  // Draft key for persisting form state
  const draftKey = `submission-draft-${id ?? 'unknown'}`;

  // Restore draft hint on mount
  const [draftHint] = useState<string | null>(() => {
    const saved = draftManager.loadDraft<{ fileName: string; fileSize: number }>(draftKey);
    return saved?.fileName ? `Previously selected: ${saved.fileName}` : null;
  });

  // Find the current student's submission
  const mySubmission = submissions?.find(
    (s) => s.profiles?.id === profile?.id,
  );

  // Track read habit — fires after 30s of viewing
  useReadHabitTimer({
    pageType: 'assignment_detail',
    pageId: id ?? '',
  });

  // Difficulty bonus: fetch Bloom's levels for linked CLOs
  const cloIds = (assignment?.clo_weights ?? []).map((cw) => cw.clo_id);
  const { data: difficultyBonus } = useAssignmentDifficultyBonus(cloIds);

  const deadlineStatus = assignment
    ? getDeadlineStatus(assignment.due_date, assignment.late_window_hours)
    : null;

  // Log assignment_view when the student opens this assignment
  useEffect(() => {
    if (!assignment || !profile?.id) return;
    logActivity({
      student_id: profile.id,
      event_type: 'assignment_view',
      metadata: {
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        duration_seconds: 0,
      },
    });
  }, [assignment?.id, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (file: File | undefined) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      draftManager.clearDraft(draftKey);
      return;
    }
    try {
      validateFile(file);
      setSelectedFile(file);
      // Persist file metadata (name/size) so user knows they had a file selected
      draftManager.saveDraft(draftKey, { fileName: file.name, fileSize: file.size });
    } catch (err) {
      if (err instanceof FileValidationError) {
        setFileError(err.message);
        setSelectedFile(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!assignment || !selectedFile) return;

    // Belt-and-suspenders: reject if submission window has closed
    const deadline = getDeadlineStatus(assignment.due_date, assignment.late_window_hours);
    if (!deadline.canSubmit) {
      toast.error('Submission window has closed.');
      return;
    }

    setUploadProgress(0);
    setUploadStatus('uploading');
    setUploadError(null);

    const MAX_UPLOAD_RETRIES = 3;

    const attemptUpload = async (retries: number): Promise<string> => {
      try {
        // Simulate progress increments during upload
        setUploadProgress(10 + retries * 5);
        const result = await uploadFile.mutateAsync({
          file: selectedFile,
          assignmentId: assignment.id,
          institutionId: '',
        });
        setUploadProgress(100);
        setUploadStatus('success');
        return result;
      } catch (err) {
        const isNetworkError = !navigator.onLine ||
          (err instanceof Error && /network|fetch|timeout|offline/i.test(err.message));

        if (isNetworkError && retries < MAX_UPLOAD_RETRIES) {
          // Wait for connectivity to be restored, then retry
          if (!navigator.onLine) {
            toast.info(`Offline — waiting for connectivity to retry (${retries + 1}/${MAX_UPLOAD_RETRIES})…`);
            await new Promise<void>((resolve) => {
              const onOnline = () => {
                window.removeEventListener('online', onOnline);
                resolve();
              };
              window.addEventListener('online', onOnline);
              // Timeout after 60s to avoid hanging forever
              setTimeout(() => {
                window.removeEventListener('online', onOnline);
                resolve();
              }, 60_000);
            });
          } else {
            // Brief delay before retry
            toast.info(`Upload failed — retrying (${retries + 1}/${MAX_UPLOAD_RETRIES})…`);
            await new Promise((r) => setTimeout(r, 2000 * (retries + 1)));
          }
          return attemptUpload(retries + 1);
        }
        setUploadStatus('error');
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        throw err;
      }
    };

    try {
      // Step 1: Upload file to Supabase Storage with retry
      const fileUrl = await attemptUpload(0);

      // Step 2: Create submission record with the real URL
      const input: CreateSubmissionInput = {
        assignment_id: assignment.id,
        file_url: fileUrl,
        is_late: deadline.isLate,
        institution_id: '',
      };

      createSubmission.mutate(input, {
        onSuccess: () => {
          draftManager.clearDraft(draftKey);
          toast.success('Assignment submitted successfully!');
          setSelectedFile(null);
          logActivity({
            student_id: profile?.id ?? '',
            event_type: 'submission',
            metadata: {
              assignment_id: assignment.id,
              is_late: deadline.isLate,
            },
          });
          // Fire-and-forget XP award with optimistic UI update
          awardXPOptimistic({
            studentId: profile?.id ?? '',
            xpAmount: deadline.isLate ? LATE_SUBMISSION_XP : XP_SCHEDULE.submission,
            source: 'submission',
            referenceId: assignment.id,
            note: deadline.isLate ? 'Late submission' : 'On-time submission',
          });
        },
        onError: (err) => {
          toast.error(`Submission failed: ${err.message}`);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadStatus('error');
      setUploadError(message);
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-lg" />
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student/assignments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments
        </Button>
        <Card className="bg-white border-0 shadow-md rounded-xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mb-3" />
            <p className="text-sm text-gray-500">Assignment not found.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/student/assignments')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments
      </Button>

      {/* Assignment Details Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
          }}
        >
          <ClipboardList className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Assignment Details
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
            {assignment.description && (
              <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Total Marks</p>
                <p className="text-sm font-medium">{assignment.total_marks}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Late Window</p>
                <p className="text-sm font-medium">
                  {assignment.late_window_hours}h after deadline
                </p>
              </div>
            </div>
          </div>

          {/* CLO Weights */}
          {assignment.clo_weights && assignment.clo_weights.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Linked CLOs</p>
              <div className="flex flex-wrap gap-2">
                {assignment.clo_weights.map((cw) => (
                  <Badge
                    key={cw.clo_id}
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    CLO: {cw.weight}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Bonus — Requirement 121.3 */}
          {difficultyBonus && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Difficulty Bonus</p>
              <div className="flex items-center gap-2">
                <BloomsPill level={difficultyBonus.bloomsLevel} />
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {difficultyBonus.multiplier}x XP Bonus
                </Badge>
              </div>
            </div>
          )}

          {/* Rubric info */}
          {assignment.rubrics && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Rubric</p>
              <Badge variant="outline">{assignment.rubrics.title}</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Submission Status / Form Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
          }}
        >
          <Upload className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Submission
          </h2>
        </div>
        <div className="p-6">
          {mySubmission ? (
            /* Already submitted */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm font-semibold text-green-700">Submitted</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Submitted At</p>
                  <p className="font-medium">
                    {format(new Date(mySubmission.submitted_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(mySubmission.submitted_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">File</p>
                  <a
                    href={mySubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium text-sm"
                  >
                    View Submission
                  </a>
                </div>
              </div>
              {mySubmission.is_late && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  Late Submission
                </Badge>
              )}
              {mySubmission.grades && mySubmission.grades.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Graded
                  </Badge>
                </div>
              )}
            </div>
          ) : !deadlineStatus?.canSubmit ? (
            /* Submission closed */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
              <p className="text-sm font-medium text-red-600">Submission Closed</p>
              <p className="text-xs text-gray-500 mt-1">
                The deadline and late window have passed.
              </p>
            </div>
          ) : (
            /* Submission form */
            <div className="space-y-4">
              {/* Time remaining countdown */}
              {deadlineStatus && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700">
                    {deadlineStatus.window === 'open'
                      ? `Due ${deadlineStatus.timeRemaining}`
                      : `Late window closes ${deadlineStatus.timeRemaining}`}
                  </p>
                </div>
              )}

              {deadlineStatus?.window === 'late_window' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                  <p className="text-xs text-orange-700">
                    The deadline has passed. Submitting now will be marked as late.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="file-upload"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Upload File
                </label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className="cursor-pointer"
                />
                {fileError && (
                  <p className="text-xs text-red-500 mt-1">{fileError}</p>
                )}
                {draftHint && !selectedFile && (
                  <p className="text-xs text-amber-600 mt-1">{draftHint} — please re-select your file</p>
                )}
                {selectedFile && !isUploading && uploadStatus !== 'error' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Upload Progress Indicator */}
              {selectedFile && (isUploading || uploadStatus === 'success' || uploadStatus === 'error') && (
                <UploadProgress
                  progress={uploadProgress}
                  fileName={selectedFile.name}
                  fileSize={selectedFile.size}
                  status={uploadStatus}
                  onRetry={handleSubmit}
                  onCancel={() => {
                    setSelectedFile(null);
                    setUploadStatus('uploading');
                    setUploadProgress(0);
                    setUploadError(null);
                  }}
                />
              )}

              {/* Upload Error State */}
              {uploadStatus === 'error' && uploadError && (
                <ErrorState
                  title="Upload Failed"
                  message={uploadError}
                  onRetry={handleSubmit}
                  retryLabel="Retry Upload"
                />
              )}

              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || isUploading || isSubmitting}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {(isUploading || isSubmitting) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {!isUploading && !isSubmitting && (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading
                  ? 'Uploading...'
                  : isSubmitting
                    ? 'Submitting...'
                    : 'Upload & Submit'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AssignmentDetailPage;
