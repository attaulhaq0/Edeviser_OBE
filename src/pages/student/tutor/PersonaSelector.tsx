// =============================================================================
// PersonaSelector — Persona picker with 3 AI tutor personas
// Supports auto-recommendation from Big Five profile (Req 26)
// =============================================================================

import { useState } from 'react';
import { HelpCircle, ListChecks, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TutorPersona } from '@/lib/tutorSchemas';

interface PersonaSelectorProps {
  selectedPersona: TutorPersona;
  onSelect: (persona: TutorPersona) => void;
  /** Inline mode shows compact buttons; full mode shows cards */
  variant?: 'inline' | 'full';
  /** Auto-recommended persona from Big Five profile */
  recommendedPersona?: TutorPersona | null;
}

interface PersonaOption {
  id: TutorPersona;
  label: string;
  description: string;
  icon: typeof HelpCircle;
  color: string;
  activeColor: string;
}

const personas: PersonaOption[] = [
  {
    id: 'socratic_guide',
    label: 'Socratic Guide',
    description: 'Asks probing questions to lead you to the answer',
    icon: HelpCircle,
    color: 'text-purple-600',
    activeColor: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'step_by_step_coach',
    label: 'Step-by-Step Coach',
    description: 'Breaks down problems into sequential steps',
    icon: ListChecks,
    color: 'text-blue-600',
    activeColor: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'quick_explainer',
    label: 'Quick Explainer',
    description: 'Gives concise, direct explanations',
    icon: Zap,
    color: 'text-teal-600',
    activeColor: 'bg-teal-50 border-teal-200 text-teal-700',
  },
];

const PersonaSelector = ({
  selectedPersona,
  onSelect,
  variant = 'inline',
  recommendedPersona,
}: PersonaSelectorProps) => {
  const [showFullPicker, setShowFullPicker] = useState(false);

  // If there's a recommendation and user hasn't opened the full picker yet,
  // show the compact recommendation view in full variant
  const showRecommendation =
    variant === 'full' &&
    recommendedPersona &&
    !showFullPicker &&
    selectedPersona === recommendedPersona;

  if (showRecommendation) {
    const recommended = personas.find((p) => p.id === recommendedPersona);
    if (recommended) {
      const Icon = recommended.icon;
      return (
        <div className="space-y-3" role="group" aria-label="Recommended tutor persona">
          <p className="text-sm font-medium text-gray-700">Your tutor style</p>
          <div
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border-2 transition-all',
              recommended.activeColor,
            )}
          >
            <div className="p-1.5 rounded-lg bg-white/60 shrink-0">
              <Icon className={cn('h-4 w-4', recommended.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{recommended.label}</p>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold gap-1 px-1.5 py-0"
                >
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </Badge>
              </div>
              <p className="text-xs mt-0.5 opacity-80">{recommended.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setShowFullPicker(true)}
          >
            Change tutor style
          </Button>
        </div>
      );
    }
  }

  if (variant === 'full') {
    return (
      <div className="space-y-3" role="radiogroup" aria-label="Select tutor persona">
        <p className="text-sm font-medium text-gray-700">Choose your tutor style</p>
        <div className="grid gap-2">
          {personas.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;
            const isRecommended = recommendedPersona === persona.id;

            return (
              <button
                key={persona.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(persona.id)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-start',
                  isSelected
                    ? persona.activeColor
                    : 'border-gray-100 bg-white hover:border-gray-200'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg shrink-0',
                    isSelected ? 'bg-white/60' : 'bg-gray-50'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isSelected ? persona.color : 'text-gray-400')} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-semibold', isSelected ? '' : 'text-gray-800')}>
                      {persona.label}
                    </p>
                    {isRecommended && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold gap-1 px-1.5 py-0"
                      >
                        <Sparkles className="h-3 w-3" />
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className={cn('text-xs mt-0.5', isSelected ? 'opacity-80' : 'text-gray-500')}>
                    {persona.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="ms-auto shrink-0 h-5 w-5 rounded-full bg-white border-2 border-current flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-current" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Inline variant — compact buttons for the chat header
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Tutor persona">
      {personas.map((persona) => {
        const Icon = persona.icon;
        const isSelected = selectedPersona === persona.id;
        const isRecommended = recommendedPersona === persona.id;

        return (
          <Button
            key={persona.id}
            variant={isSelected ? 'secondary' : 'ghost'}
            size="sm"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(persona.id)}
            className={cn(
              'gap-1 text-xs h-7 px-2',
              isSelected && persona.activeColor
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{persona.label}</span>
            {isRecommended && isSelected && (
              <Sparkles className="h-3 w-3 text-amber-500" />
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;
export type { PersonaSelectorProps };
