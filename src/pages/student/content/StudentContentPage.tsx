/**
 * Task 21.2: Student Content Page — Content creation and listing
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useStudentContentList, type StudentContent } from '@/hooks/useStudentContent';
import { FileText, Plus, BookOpen, HelpCircle, Video } from 'lucide-react';
import GradientCardHeader from '@/components/shared/GradientCardHeader';
import ContentForm from '@/pages/student/content/ContentForm';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  study_plan: BookOpen,
  quiz_question: HelpCircle,
  explanation_video: Video,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  study_plan: 'Study Plan',
  quiz_question: 'Quiz Question',
  explanation_video: 'Explanation Video',
};

const ContentCard = ({ content }: { content: StudentContent }) => {
  const Icon = CONTENT_TYPE_ICONS[content.content_type] ?? FileText;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight truncate">{content.title}</h3>
            <p className="text-xs text-gray-500">
              {CONTENT_TYPE_LABELS[content.content_type]} · {format(new Date(content.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Badge className={`text-xs shrink-0 capitalize ${STATUS_STYLES[content.status] ?? ''}`}>
          {content.status}
        </Badge>
      </div>
      {content.feedback && (
        <p className="text-xs text-gray-600 bg-slate-50 rounded-lg p-2">
          Feedback: {content.feedback}
        </p>
      )}
    </Card>
  );
};

const StudentContentPage = () => {
  const { user } = useAuth();
  const studentId = user?.id;
  const { data: contentList, isLoading } = useStudentContentList(studentId);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">My Content</h1>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
        >
          <Plus className="h-4 w-4" /> Create Content
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <ContentForm onClose={() => setShowForm(false)} />
      )}

      {/* Content List */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={FileText} title="My Submissions" />
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-shimmer" />
              ))}
            </div>
          ) : !contentList || contentList.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">You haven't created any content yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create study plans, quiz questions, or explanation videos to earn badges.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contentList.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentContentPage;
