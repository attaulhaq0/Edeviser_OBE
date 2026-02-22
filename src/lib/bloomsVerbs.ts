import type { BloomsLevel } from '@/lib/schemas/clo';

export const BLOOMS_VERBS: Record<BloomsLevel, string[]> = {
  remembering: ['define', 'list', 'recall', 'identify', 'state', 'name'],
  understanding: ['explain', 'describe', 'classify', 'summarize', 'paraphrase'],
  applying: ['use', 'implement', 'execute', 'solve', 'demonstrate', 'construct'],
  analyzing: ['compare', 'differentiate', 'examine', 'break down', 'infer'],
  evaluating: ['judge', 'critique', 'defend', 'argue', 'assess', 'recommend'],
  creating: ['design', 'develop', 'compose', 'build', 'formulate', 'produce'],
};

export const BLOOMS_COLORS: Record<BloomsLevel, { bg: string; text: string; hover: string }> = {
  remembering: { bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:bg-purple-200' },
  understanding: { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
  applying: { bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-200' },
  analyzing: { bg: 'bg-yellow-100', text: 'text-yellow-700', hover: 'hover:bg-yellow-200' },
  evaluating: { bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:bg-orange-200' },
  creating: { bg: 'bg-red-100', text: 'text-red-700', hover: 'hover:bg-red-200' },
};
