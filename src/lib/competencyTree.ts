import type { Database } from "@/types/database";

export interface CompetencyItem {
  id: string;
  framework_id: string;
  parent_id: string | null;
  // Preserve numeric levels; their domain meaning is framework-specific.
  level: number | "domain" | "competency" | "indicator" | null;
  code?: string;
  title: string;
  description?: string | null;
  sort_order: number | null;
}

export const toCompetencyItem = (
  row: Pick<
    Database["public"]["Tables"]["competency_items"]["Row"],
    | "id"
    | "framework_id"
    | "parent_id"
    | "level"
    | "name"
    | "description"
    | "sort_order"
  >
): CompetencyItem => ({
  id: row.id,
  framework_id: row.framework_id,
  parent_id: row.parent_id,
  level: row.level,
  title: row.name,
  description: row.description,
  sort_order: row.sort_order,
});

export interface CompetencyNode extends CompetencyItem {
  children: CompetencyNode[];
}

/** Keep every visible record reachable even for orphan/cyclic parent links.
 * Broken links are surfaced as a warning, never silently repaired in storage.
 */
export const buildCompetencyTree = (items: readonly CompetencyItem[]) => {
  const nodes = new Map(
    items.map((item) => [item.id, { ...item, children: [] } as CompetencyNode])
  );
  const roots: CompetencyNode[] = [];
  let hasBrokenLinks = false;
  for (const node of nodes.values()) {
    const seen = new Set([node.id]);
    let parentId = node.parent_id;
    let broken = false;
    while (parentId) {
      const parent = nodes.get(parentId);
      if (!parent || seen.has(parentId)) {
        broken = true;
        break;
      }
      seen.add(parentId);
      parentId = parent.parent_id;
    }
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (broken) hasBrokenLinks = true;
    if (parent && !broken) parent.children.push(node);
    else roots.push(node);
  }
  return { roots, hasBrokenLinks };
};
