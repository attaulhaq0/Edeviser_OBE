import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import { buildCompetencyTree } from "@/lib/competencyTree";
import type { CompetencyItem, CompetencyNode } from "@/lib/competencyTree";

interface CompetencyTreeProps {
  items: CompetencyItem[];
  mappedItemIds?: Set<string>;
}

const TreeNode = ({
  item,
  mappedItemIds,
  selectedId,
  onSelect,
  depth = 0,
}: {
  item: CompetencyNode;
  mappedItemIds?: Set<string>;
  selectedId?: string;
  onSelect: (id: string) => void;
  depth?: number;
}) => {
  const { t } = useTranslation("admin");
  const [expanded, setExpanded] = useState(depth < 1);
  const childrenId = useId();
  const hasChildren = item.children.length > 0;
  const title = item.title.trim() || t("competency.untitled");
  const isUnmapped =
    item.level === "indicator" && mappedItemIds && !mappedItemIds.has(item.id);
  const level =
    typeof item.level === "number"
      ? t("competency.level", { level: item.level })
      : item.level
      ? t(`competency.${item.level}`)
      : t("competency.levelUnknown");

  return (
    <li>
      <div className="flex items-start gap-2 rounded-lg py-1.5">
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t(
              expanded ? "competency.collapse" : "competency.expand",
              { title }
            )}
            aria-expanded={expanded}
            aria-controls={childrenId}
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight
                className="h-4 w-4 rtl:rotate-180"
                aria-hidden="true"
              />
            )}
          </Button>
        ) : (
          <span className="w-9 shrink-0" aria-hidden="true" />
        )}
        <Button
          type="button"
          variant="ghost"
          aria-pressed={selectedId === item.id}
          onClick={() => onSelect(item.id)}
          className="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal px-2 py-2 text-start aria-pressed:bg-muted"
        >
          <span className="min-w-0 space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {level}
              </Badge>
              {item.code && (
                <span className="text-xs font-mono text-muted-foreground">
                  {item.code}
                </span>
              )}
              <span className="text-sm text-foreground">{title}</span>
              {isUnmapped && (
                <Badge className="text-[10px] bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-3 w-3 me-1" aria-hidden="true" />
                  {t("competency.unmapped")}
                </Badge>
              )}
            </span>
            {item.description && (
              <span className="block text-xs font-normal text-muted-foreground">
                {item.description}
              </span>
            )}
          </span>
        </Button>
      </div>
      {hasChildren && (
        <ul
          id={childrenId}
          hidden={!expanded}
          className="ms-4 border-s border-border ps-2"
        >
          {expanded &&
            item.children.map((child) => (
              <TreeNode
                key={child.id}
                item={child}
                mappedItemIds={mappedItemIds}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
        </ul>
      )}
    </li>
  );
};

const CompetencyTree = ({ items, mappedItemIds }: CompetencyTreeProps) => {
  const { t } = useTranslation("admin");
  const [selectedId, setSelectedId] = useState<string>();
  const headingId = useId();
  const { roots, hasBrokenLinks } = buildCompetencyTree(items);
  const selected = items.find((item) => item.id === selectedId);

  if (roots.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {t("competency.empty")}
      </p>
    );

  return (
    <div className="space-y-4">
      {hasBrokenLinks && (
        <p role="status" className="text-sm text-amber-700">
          {t("competency.brokenLinks")}
        </p>
      )}
      <ul aria-label={t("competency.hierarchy")} className="space-y-0.5">
        {roots.map((item) => (
          <TreeNode
            key={item.id}
            item={item}
            mappedItemIds={mappedItemIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </ul>
      <section
        aria-labelledby={headingId}
        className="rounded-xl border border-border p-4"
        aria-live="polite"
      >
        <h3 id={headingId} className="text-sm font-semibold">
          {t("competency.details")}
        </h3>
        {selected ? (
          <>
            <p className="mt-2 font-medium">
              {selected.title.trim() || t("competency.untitled")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {selected.description?.trim() || t("competency.noDescription")}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("competency.selectItem")}
          </p>
        )}
      </section>
    </div>
  );
};

export default CompetencyTree;
