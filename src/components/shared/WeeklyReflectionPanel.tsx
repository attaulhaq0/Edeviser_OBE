import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PenLine, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countWords } from '@/lib/plannerUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyReflectionPanelProps {
  weekStartDate: string;
  onSave: (content: string) => void;
  isSaving?: boolean;
  /** Pre-populated session reflection summaries for context. */
  sessionReflectionSummaries?: string[];
  /** Whether a weekly reflection has already been saved for this week. */
  alreadySaved?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MIN_WORDS = 50;

const WeeklyReflectionPanel = ({
  weekStartDate: _weekStartDate,
  onSave,
  isSaving = false,
  sessionReflectionSummaries = [],
  alreadySaved = false,
}: WeeklyReflectionPanelProps) => {
  const [content, setContent] = useState('');
  const wordCount = countWords(content);
  const meetsMinimum = wordCount >= MIN_WORDS;

  const handleSave = () => {
    if (meetsMinimum) {
      onSave(content);
    }
  };

  if (alreadySaved) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
          }}
        >
          <PenLine className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Weekly Reflection
          </h2>
        </div>
        <div className="p-6 text-center">
          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">
            You've already submitted your reflection for this week. Great job!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl overflow-hidden"
      data-testid="weekly-reflection-panel"
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <PenLine className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Weekly Reflection
        </h2>
      </div>
      <div className="p-6 space-y-4">
        {/* Context from session reflections */}
        {sessionReflectionSummaries.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              This week's session reflections
            </p>
            {sessionReflectionSummaries.map((summary, i) => (
              <p key={i} className="text-xs text-gray-600 italic">
                "{summary.length > 120 ? `${summary.slice(0, 117)}…` : summary}"
              </p>
            ))}
          </div>
        )}

        {/* Prompt */}
        <p className="text-sm text-gray-600">
          Reflect on your week: What worked well? What would you change? What are
          your goals for next week?
        </p>

        {/* Textarea */}
        <Textarea
          placeholder="Write your weekly reflection (minimum 50 words)…"
          className="resize-none"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Weekly reflection"
          aria-describedby="weekly-reflection-word-count"
        />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p
            id="weekly-reflection-word-count"
            className={cn(
              'flex items-center gap-1 text-xs font-medium transition-colors',
              meetsMinimum ? 'text-green-600' : 'text-gray-400',
            )}
          >
            {meetsMinimum && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>
              {wordCount} / {MIN_WORDS} words
            </span>
          </p>
          <Button
            size="sm"
            disabled={!meetsMinimum || isSaving}
            onClick={handleSave}
            className={cn(
              'min-h-[44px] font-semibold transition-all',
              meetsMinimum
                ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md active:scale-95'
                : '',
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save Reflection'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyReflectionPanel;
