import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen, Presentation, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { SourceCitation } from '@/lib/tutorSchemas';

interface SourceCitationPanelProps {
  citations: SourceCitation[];
}

const materialTypeIcons: Record<string, typeof FileText> = {
  lecture_notes: BookOpen,
  slides: Presentation,
  assignment_description: ClipboardList,
  rubric_criteria: ClipboardList,
  other: FileText,
};

const materialTypeLabels: Record<string, string> = {
  lecture_notes: 'Lecture Notes',
  slides: 'Slides',
  assignment_description: 'Assignment',
  rubric_criteria: 'Rubric',
  other: 'Document',
};

const SourceCitationPanel = ({ citations }: SourceCitationPanelProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (citations.length === 0) return null;

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        Sources
      </p>
      <div className="space-y-1">
        {citations.map((citation, index) => {
          const Icon = materialTypeIcons[citation.material_type] ?? FileText;
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={citation.chunk_id}
              className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                aria-expanded={isExpanded}
              >
                <Badge
                  variant="outline"
                  className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold shrink-0"
                >
                  {index + 1}
                </Badge>
                <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate flex-1">
                  {citation.source_filename}
                </span>
                <span className="text-[10px] text-gray-400">
                  {materialTypeLabels[citation.material_type] ?? 'Document'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                )}
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-40' : 'max-h-0',
                )}
              >
                <div className="px-3 pb-2">
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                    {citation.chunk_text}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Relevance: {Math.round(citation.similarity_score * 100)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SourceCitationPanel;
