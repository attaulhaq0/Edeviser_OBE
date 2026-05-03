// =============================================================================
// ContentForm — Form for study plans, quiz questions, explanation videos
// Task 21.3
// =============================================================================

import { useState } from 'react';
import { useCreateStudentContent } from '@/hooks/useStudentContent';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import type { ContentType } from '@/lib/marketplaceSchemas';

interface ContentFormProps {
  onClose: () => void;
}

const ContentForm = ({ onClose }: ContentFormProps) => {
  const { profile } = useAuth();
  const createContent = useCreateStudentContent();

  const [contentType, setContentType] = useState<ContentType>('study_plan');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !title.trim()) return;

    createContent.mutate(
      {
        content_type: contentType,
        title,
        clo_id: null,
        content_data: { body },
        studentId: profile.id,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">Create Content</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select
            value={contentType}
            onValueChange={(v) => setContentType(v as ContentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="study_plan">Study Plan</SelectItem>
              <SelectItem value="quiz_question">Quiz Question</SelectItem>
              <SelectItem value="explanation_video">Explanation Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            placeholder="Enter a title for your content"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            placeholder="Describe your content..."
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createContent.isPending || !title.trim()}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {createContent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit for Review
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ContentForm;
