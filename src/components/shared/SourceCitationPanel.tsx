// =============================================================================
// SourceCitationPanel — Expandable citation detail panel for tutor messages
// =============================================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SourceCitation } from '@/lib/tutorSchemas';

interface SourceCitationPanelProps {
  citations: SourceCitation[];
  /** Index of the citation to auto-expand (from clicking inline marker) */
  expandedIndex?: number | null;
  onExpandedChange?: (index: number | null) => void;
}

const materialTypeLabels: Record<string, string> = {
  lecture_notes: 'Lecture Notes',
  slides: 'Slides',
  assignment_description: 'Assignment',
  rubric_criteria: 'Rubric',
  other: 'Material',
};

const materialTypeIcons: Record<string, typeof FileText> = {
  lecture_notes: BookOpen,
  slides: FileText,
  assignment_description: FileText,
  rubric_criteria: FileText,
  other: FileText,
};

const SourceCitationPanel = ({
  citations,
  expandedIndex: controlledExpanded,
  onExpandedChange,
}: SourceCitationPanelProps) => {
  const [internalExpanded, setInternalExpanded] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const expandedIndex = controlledExpanded ?? internalExpanded;
  const setExpandedIndex = onExpandedChange ?? setInternalExpanded;

  if (citations.length === 0) return null;

  const toggleCitation = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-500 hover:text-gray-700 gap-1 px-2 h-7"
        aria-expanded={isOpen}
        aria-label={`${citations.length} source${citations.length !== 1 ? 's' : ''} referenced`}
      >
        <FileText className="h-3.5 w-3.5" />
        {citations.length} source{citations.length !== 1 ? 's' : ''}
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      {isOpen && (
        <div className="mt-1.5 space-y-1.5" role="list" aria-label="Source citations">
          {citations.map((citation, index) => {
            const Icon = materialTypeIcons[citation.material_type] ?? FileText;
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={citation.chunk_id}
                role="listitem"
                className={cn(
                  'rounded-lg border transition-colors',
                  isExpanded ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50'
                )}
              >
                <button
                  onClick={() => toggleCitation(index)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-start"
                  aria-expanded={isExpanded}
                >
                  <Badge variant="secondary" className="text-[10px] font-bold shrink-0 h-5 w-5 p-0 justify-center">
                    {index + 1}
                  </Badge>
                  <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate flex-1">
                    {citation.source_filename}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {materialTypeLabels[citation.material_type] ?? 'Material'}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {citation.chunk_text}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">
                        Relevance: {Math.round(citation.similarity_score * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SourceCitationPanel;
export type { SourceCitationPanelProps };
