import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface PracticeModeToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const PracticeModeToggle = ({
  checked,
  onCheckedChange,
  disabled,
}: PracticeModeToggleProps) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
      <div className="space-y-0.5">
        <Label htmlFor="practice-mode" className="text-sm font-medium">
          Allow Practice Mode
        </Label>
        <p className="text-xs text-gray-500">
          Students can take this quiz without grade impact
        </p>
      </div>
      <Switch
        id="practice-mode"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label="Allow Practice Mode"
      />
    </div>
  );
};

export { PracticeModeToggle };
export default PracticeModeToggle;
