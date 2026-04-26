import { HelpCircle, ListOrdered, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TutorPersona } from '@/lib/tutorSchemas';

interface PersonaSelectorProps {
  selected: TutorPersona;
  onSelect: (persona: TutorPersona) => void;
  recommended?: TutorPersona | null;
}

const personas: Array<{
  id: TutorPersona;
  label: string;
  description: string;
  icon: typeof HelpCircle;
}> = [
  {
    id: 'socratic_guide',
    label: 'Socratic Guide',
    description: 'Asks probing questions to lead you to the answer',
    icon: HelpCircle,
  },
  {
    id: 'step_by_step_coach',
    label: 'Step-by-Step Coach',
    description: 'Breaks down problems into clear, numbered steps',
    icon: ListOrdered,
  },
  {
    id: 'quick_explainer',
    label: 'Quick Explainer',
    description: 'Gives concise, direct explanations with examples',
    icon: Zap,
  },
];

const PersonaSelector = ({ selected, onSelect, recommended }: PersonaSelectorProps) => {
  return (
    <div className="space-y-1.5">
      {recommended && (
        <p className="text-[10px] font-bold tracking-wide uppercase text-teal-600">
          ★ Recommended for you: {personas.find((p) => p.id === recommended)?.label}
        </p>
      )}
      <div className="flex gap-2">
        {personas.map(({ id, label, icon: Icon }) => {
          const isSelected = selected === id;
          const isRecommended = recommended === id;

          return (
            <button
              key={id}
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isRecommended
                    ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
              )}
              onClick={() => onSelect(id)}
              aria-pressed={isSelected}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {isRecommended && !isSelected && (
                <span className="text-[10px] text-teal-600 font-bold ms-0.5">★</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaSelector;
