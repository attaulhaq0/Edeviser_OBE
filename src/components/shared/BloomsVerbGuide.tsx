import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BLOOMS_VERBS, BLOOMS_COLORS } from '@/lib/bloomsVerbs';
import type { BloomsLevel } from '@/lib/schemas/clo';
import { cn } from '@/lib/utils';

interface BloomsVerbGuideProps {
  selectedLevel?: BloomsLevel;
  onVerbClick: (verb: string) => void;
}

const BloomsVerbGuide = ({ selectedLevel, onVerbClick }: BloomsVerbGuideProps) => {
  if (!selectedLevel) return null;

  const verbs = BLOOMS_VERBS[selectedLevel];
  const colors = BLOOMS_COLORS[selectedLevel];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedLevel}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Suggested Verbs</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {verbs.map((verb) => (
            <Badge
              key={verb}
              className={cn(
                colors.bg,
                colors.text,
                colors.hover,
                'cursor-pointer select-none border-0 transition-colors',
              )}
              onClick={() => onVerbClick(verb)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onVerbClick(verb);
                }
              }}
            >
              {verb}
            </Badge>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BloomsVerbGuide;
