import { CircleHelp } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WhyThisPopoverProps {
  title: string;
  reasons: string[];
  className?: string;
}

/**
 * Reusable A2 explainability control for hero, rail, and AI-suggestion cards.
 * The caller supplies only auditable, data-backed reasons for the card.
 */
const WhyThisPopover = ({ title, reasons, className }: WhyThisPopoverProps) => {
  const { t } = useTranslation("common");
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground",
            className
          )}
          aria-label={t("header.whyThis")}
        >
          <CircleHelp className="size-3.5" aria-hidden="true" />
          {t("header.whyThis")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        role="dialog"
        aria-labelledby={titleId}
        className="w-80 space-y-2"
      >
        <h3 id={titleId} className="text-sm font-bold text-foreground">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("header.whyThisDescription")}
        </p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-primary" aria-hidden="true">
                •
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default WhyThisPopover;
