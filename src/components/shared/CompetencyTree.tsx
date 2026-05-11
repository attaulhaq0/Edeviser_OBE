// Task 115.2: Competency Tree shared component

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import type { CompetencyItem } from "@/hooks/useCompetencyFrameworks";

interface CompetencyTreeProps {
  items: CompetencyItem[];
  mappedItemIds?: Set<string>;
}

const buildTree = (items: CompetencyItem[]): CompetencyItem[] => {
  const map = new Map<
    string,
    CompetencyItem & { children: CompetencyItem[] }
  >();
  const roots: (CompetencyItem & { children: CompetencyItem[] })[] = [];

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const TreeNode = ({
  item,
  mappedItemIds,
  depth = 0,
}: {
  item: CompetencyItem & { children?: CompetencyItem[] };
  mappedItemIds?: Set<string>;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const isUnmapped =
    item.level === "indicator" && mappedItemIds && !mappedItemIds.has(item.id);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
          depth > 0 ? "ml-" + depth * 4 : ""
        }`}
        style={{ marginLeft: depth * 16 }}
        role="button"
        tabIndex={0}
        onClick={() => hasChildren && setExpanded(!expanded)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && hasChildren) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <Badge variant="outline" className="text-[9px] px-1">
          {item.level}
        </Badge>
        <span className="text-xs font-mono text-slate-400">{item.code}</span>
        <span className="text-sm text-slate-700 truncate">{item.title}</span>
        {isUnmapped && (
          <Badge className="text-[9px] bg-amber-100 text-amber-700 ml-auto">
            <AlertTriangle className="h-2.5 w-2.5 me-0.5" />
            Unmapped
          </Badge>
        )}
      </div>
      {expanded &&
        (item.children ?? []).map((child) => (
          <TreeNode
            key={child.id}
            item={child as CompetencyItem & { children?: CompetencyItem[] }}
            mappedItemIds={mappedItemIds}
            depth={depth + 1}
          />
        ))}
    </div>
  );
};

const CompetencyTree = ({ items, mappedItemIds }: CompetencyTreeProps) => {
  const tree = buildTree(items);

  if (tree.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No competency items.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((item) => (
        <TreeNode
          key={item.id}
          item={item as CompetencyItem & { children?: CompetencyItem[] }}
          mappedItemIds={mappedItemIds}
        />
      ))}
    </div>
  );
};

export default CompetencyTree;
