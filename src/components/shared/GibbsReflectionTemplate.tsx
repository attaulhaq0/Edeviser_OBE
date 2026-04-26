import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { GibbsReflectionValues } from '@/types/planner';

export interface GibbsReflectionTemplateProps {
  values: GibbsReflectionValues;
  onChange: (values: GibbsReflectionValues) => void;
}

const stages: Array<{ key: keyof GibbsReflectionValues; label: string; placeholder: string }> = [
  { key: 'description', label: 'Description', placeholder: 'What happened during the session?' },
  { key: 'feelings', label: 'Feelings', placeholder: 'What were you thinking and feeling?' },
  { key: 'evaluation', label: 'Evaluation', placeholder: 'What was good and bad about the experience?' },
  { key: 'analysis', label: 'Analysis', placeholder: 'What sense can you make of the situation?' },
  { key: 'conclusion', label: 'Conclusion', placeholder: 'What else could you have done?' },
  { key: 'actionPlan', label: 'Action Plan', placeholder: 'If it arose again, what would you do?' },
];

const GibbsReflectionTemplate = ({
  values,
  onChange,
}: GibbsReflectionTemplateProps) => {
  const update = (field: keyof GibbsReflectionValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="space-y-4" data-testid="gibbs-reflection-template">
      {stages.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`gibbs-${key}`}>{label}</Label>
          <Textarea
            id={`gibbs-${key}`}
            placeholder={placeholder}
            className="resize-none"
            rows={2}
            value={values[key]}
            onChange={(e) => update(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
};

export default GibbsReflectionTemplate;
