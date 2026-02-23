import { useState } from 'react';
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
import { awardXP } from '@/lib/xpClient';
import { XP_SCHEDULE, LATE_SUBMISSION_XP } from '@/lib/xpSchedule';

// ─── AssignmentDetailPage ───────────────────────────────────────────────────

const AssignmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id);
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions({
    assignmentId: id,
  });
  const createSubmission = useCreateSubmission();
  const uploadFile = useUploadSubmissionFile();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const isLoading = assignmentLoading || submissionsLoading;
  const isUploading = uploadFile.isPending;
  const isSubmitting = createSubmission.isPending;

  // Find the current student's submission
  const mySubmission = submissions?.find(
    (s) => s.profiles?.id === profile?.id,
  );

  const deadlineStatus = assignment
    ? getDeadlineStatus(assignment.due_date, assignment.late_window_hours)
    : null;

  const handleFileChange = (file: File | undefined) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    try {
      validateFile(file);
      setSelectedFile(file);
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

    try {
      // Step 1: Upload file to Supabase Storage
      const fileUrl = await uploadFile.mutateAsync({
        file: selectedFile,
        assignmentId: assignment.id,
        institutionId: assignment.institution_id,
      });

      // Step 2: Create submission record with the real URL
      const input: CreateSubmissionInput = {
        assignment_id: assignment.id,
        file_url: fileUrl,
        is_late: deadline.isLate,
        institution_id: assignment.institution_id,
      };

      createSubmission.mutate(input, {
        onSuccess: () => {
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
          // Fire-and-forget XP award — never blocks UI
          awardXP({
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
                    {format(new Date(mySubmission.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(mySubmission.created_at), {
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
              {mySubmission.grades && (
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
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

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
