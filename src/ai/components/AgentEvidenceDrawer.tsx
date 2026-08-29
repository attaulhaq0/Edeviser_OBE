// Feature: Unified agent UI (tasks.md 3.1 — Wave D).
// AgentEvidenceDrawer: Sheet-based viewer for the evidence references that
// back an agent answer or proposal. Input is untrusted: every entry passes a
// strict guard, invalid rows are skipped (fail-closed), and identifiers are
// rendered as monospace text (never interpolated into links).
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FileSearch } from "lucide-react";

export interface AgentEvidenceRef {
  readonly title: string;
  readonly table?: string;
  readonly id?: string;
}

export interface AgentEvidenceDrawerProps {
  readonly evidence: readonly unknown[];
  readonly className?: string;
}

const MAX_EVIDENCE = 50;

/** Fails closed: only {title: string, table?: string, id?: string} passes. */
const toEvidenceRef = (value: unknown): AgentEvidenceRef | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || record.title.length === 0) {
    return null;
  }
  return {
    title: record.title.slice(0, 300),
    table:
      typeof record.table === "string" && record.table.length > 0
        ? record.table.slice(0, 100)
        : undefined,
    id:
      typeof record.id === "string" && record.id.length > 0
        ? record.id.slice(0, 100)
        : undefined,
  };
};

const AgentEvidenceDrawer = ({
  evidence,
  className,
}: AgentEvidenceDrawerProps) => {
  const { t } = useTranslation("ai");
  const refs = evidence
    .slice(0, MAX_EVIDENCE)
    .map(toEvidenceRef)
    .filter((ref): ref is AgentEvidenceRef => ref !== null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          disabled={refs.length === 0}
        >
          <FileSearch className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {t("evidenceDrawer.open", "View evidence")}
          <Badge variant="outline" className="ms-1.5 bg-transparent">
            {refs.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {t("evidenceDrawer.title", "Evidence sources")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "evidenceDrawer.subtitle",
              "Every claim traces to scoped database evidence."
            )}
          </SheetDescription>
        </SheetHeader>
        {refs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {t("evidenceDrawer.empty", "No evidence references attached.")}
          </p>
        ) : (
          <ul className="space-y-3 px-4 pb-6">
            {refs.map((ref, index) => (
              <li
                key={`${ref.id ?? ref.title}-${index}`}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {ref.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {ref.table && (
                    <Badge
                      variant="outline"
                      className="bg-transparent text-[10px]"
                    >
                      {ref.table}
                    </Badge>
                  )}
                  {ref.id && (
                    <code className="text-[10px] text-gray-500">{ref.id}</code>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AgentEvidenceDrawer;
