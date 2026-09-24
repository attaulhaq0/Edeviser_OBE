import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button, Label } from "@/design-system/primitives";

export interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** A text-labelled switch with a real 44px button and one clickable label area. */
export default function PreferenceToggle({ label, description, checked, onCheckedChange, disabled }: PreferenceToggleProps) {
  const id = useId();
  const { t } = useTranslation("common");
  return <Label htmlFor={id} className="flex min-w-0 cursor-pointer flex-wrap items-center gap-4 rounded-lg py-2">
    <span className="min-w-0 basis-48 grow space-y-1">
      <span id={`${id}-label`} className="block break-words text-base font-medium text-foreground">{label}</span>
      <span id={`${id}-description`} className="block text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">{description}</span>
    </span>
    <Button id={id} type="button" role="switch" aria-checked={checked}
      aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}
      variant={checked ? "default" : "outline"} disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="ms-auto h-auto min-h-11 min-w-16 max-w-full whitespace-normal">
      {t(checked ? "accessibility.on" : "accessibility.off")}
    </Button>
  </Label>;
}
