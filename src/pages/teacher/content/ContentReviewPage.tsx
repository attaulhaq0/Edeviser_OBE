// =============================================================================
// ContentReviewPage — Teacher review queue for student content
// Task 21.7
// =============================================================================

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Check, X } from 'lucide-react';
import { useStudentContent, useReviewStudentContent } from '@/hooks/useStudentContent';
import { useAuth } from '@/hooks/useAuth';

const ContentReviewPage = () => {
  const { profile } = useAuth();
  const { data: content, isLoading } = useStudentContent();
  const reviewContent = useReviewStudentContent();

  const pendingContent = (content ?? []).filter((c) => c.status === 'pending');

  const handleReview = (contentId: string, status: 'approved' | 'rejected') => {
    if (!profile?.id) return;
    reviewContent.mutate({
      content_id: contentId,
      status,
      reviewerId: profile.id,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Content Review Queue</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : pendingContent.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No content pending review</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingContent.map((item) => (
            <Card key={item.id} className="bg-white border-0 shadow-md rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.content_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    disabled={reviewContent.isPending}
                    onClick={() => handleReview(item.id, 'approved')}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={reviewContent.isPending}
                    onClick={() => handleReview(item.id, 'rejected')}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentReviewPage;
