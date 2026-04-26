import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText } from 'lucide-react';
import type { ReflectionTemplateType } from '@/types/planner';

export interface ReflectionTemplateSelectorProps {
  selectedTemplate: ReflectionTemplateType;
  onChange: (template: ReflectionTemplateType) => void;
}

const templateLabels: Record<ReflectionTemplateType, string> = {
  free_form: 'Free-form',
  simple: 'Simple (3 questions)',
  gibbs: "Gibbs' Cycle (6 stages)",
};

const ReflectionTemplateSelector = ({
  selectedTemplate,
  onChange,
}: ReflectionTemplateSelectorProps) => {
  return (
    <div className="flex items-center gap-2" data-testid="reflection-template-selector">
      <FileText className="h-4 w-4 text-gray-500 shrink-0" />
      <Select
        value={selectedTemplate}
        onValueChange={(v) => onChange(v as ReflectionTemplateType)}
      >
        <SelectTrigger className="bg-white w-56">
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(templateLabels) as Array<[ReflectionTemplateType, string]>).map(
            ([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ReflectionTemplateSelector;
