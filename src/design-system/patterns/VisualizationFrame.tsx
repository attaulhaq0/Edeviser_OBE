import { useId, useState, type HTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/design-system/primitives";
import PCard from "@/design-system/patterns/PCard";
import SectionHeader from "@/design-system/patterns/SectionHeader";
import { cn } from "@/lib/utils";

export interface VisualizationFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  title: string;
  /** Concise, caller-localized description of the supplied data, not inferred insight. */
  summary: string;
  icon?: LucideIcon;
  controls?: ReactNode;
  children: ReactNode;
  /** Caller owns the real alternative data and all localized disclosure labels. */
  dataDisclosure?: { label: string; showLabel: string; hideLabel: string; content: ReactNode };
}

/** A reading surface and named figure, not a chart engine or domain classifier. */
export default function VisualizationFrame({ title, summary, icon, controls, children, dataDisclosure, className, ...props }: VisualizationFrameProps) {
  const id = useId();
  const [dataOpen, setDataOpen] = useState(false);
  const titleId = `${id}-title`, summaryId = `${id}-summary`, dataId = `${id}-data`;
  return <PCard className={cn("min-w-0", className)} {...props}>
    <figure className="m-0 min-w-0 space-y-4 p-5" aria-labelledby={titleId} aria-describedby={summaryId}>
      <figcaption id={titleId}><SectionHeader title={title} icon={icon} /></figcaption>
      <p id={summaryId} className="min-w-0 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{summary}</p>
      {controls}
      <div className="min-w-0 [&_svg[tabindex]:focus-visible]:outline-[3px] [&_svg[tabindex]:focus-visible]:outline-solid [&_svg[tabindex]:focus-visible]:outline-ring [&_svg[tabindex]:focus-visible]:outline-offset-2">{children}</div>
      {dataDisclosure && <>
        <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal [overflow-wrap:anywhere]"
          aria-expanded={dataOpen} aria-controls={dataId} onClick={() => setDataOpen((open) => !open)}>
          {dataOpen ? dataDisclosure.hideLabel : dataDisclosure.showLabel}
        </Button>
        <div id={dataId} role="region" aria-label={dataDisclosure.label} hidden={!dataOpen} className="min-w-0">
          {dataDisclosure.content}
        </div>
      </>}
    </figure>
  </PCard>;
}
