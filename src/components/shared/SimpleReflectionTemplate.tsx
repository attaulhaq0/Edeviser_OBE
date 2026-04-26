import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { SimpleReflectionValues } from '@/types/planner';

export interface SimpleReflectionTemplateProps {
  values: SimpleReflectionValues;
  onChange: (values: SimpleReflectionValues) => void;
}

const SimpleReflectionTemplate = ({
  values,
  onChange,
}: SimpleReflectionTemplateProps) => {
  const update = (field: keyof SimpleReflectionValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="space-y-4" data-testid="simple-reflection-template">
      <div className="space-y-1.5">
        <Label htmlFor="simple-well">What went well?</Label>
        <Textarea
          id="simple-well"
          placeholder="Describe what worked during your study session…"
          className="resize-none"
          rows={3}
          value={values.whatWentWell}
          onChange={(e) => update('whatWentWell', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="simple-challenging">What was challenging?</Label>
        <Textarea
          id="simple-challenging"
          placeholder="Describe any difficulties or obstacles…"
          className="resize-none"
          rows={3}
          value={values.whatWasChallenging}
          onChange={(e) => update('whatWasChallenging', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="simple-change">What will I do differently?</Label>
        <Textarea
          id="simple-change"
          placeholder="Describe what you'll change next time…"
          className="resize-none"
          rows={3}
          value={values.whatWillChange}
          onChange={(e) => update('whatWillChange', e.target.value)}
        />
      </div>
    </div>
  );
};

export default SimpleReflectionTemplate;
