// Task 118.2: Sankey Diagram View page
// Req 11 (qa-partner-review-remediation): render a real recharts Sankey flow that
// draws each mapping in `links`. When there are no links to draw, fall back to the
// "Outcome Mapping" column layout (the term "Sankey" never appears in that branch).

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { parseAsString, useQueryState } from "nuqs";
import { useSankeyData } from "@/hooks/useVisualizationData";
import { usePrograms } from "@/hooks/usePrograms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoOutcomes, InlineLoadError } from "@/components/shared/EmptyState";
import Shimmer from "@/components/shared/Shimmer";
import { GitBranch } from "lucide-react";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  type SankeyNodeProps,
} from "recharts";
import { useGatedMotion } from "@/lib/motionGate";
import type { SankeyNode, SankeyLink } from "@/lib/sankeyTransform";

const FALLBACK_NODE_COLOR = "#94a3b8";

// ── Real recharts Sankey flow ──────────────────────────────────────────────
// Maps the hook's { nodes, links } into recharts' index-based data shape and
// draws each mapping as a visible flow connection (Req 11.2).

interface SankeyFlowProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const SankeyFlow = ({ nodes, links }: SankeyFlowProps) => {
  const { prefersReducedMotion } = useGatedMotion();

  // Only feed recharts the nodes that participate in at least one link, and
  // remap link source/target onto the compacted node array. Disconnected nodes
  // break the Sankey layout, so excluding them keeps the diagram robust.
  const { data, colors } = useMemo(() => {
    const used = new Set<number>();
    for (const link of links) {
      used.add(link.source);
      used.add(link.target);
    }

    const oldToNew = new Map<number, number>();
    const connected: SankeyNode[] = [];
    nodes.forEach((node, index) => {
      if (used.has(index)) {
        oldToNew.set(index, connected.length);
        connected.push(node);
      }
    });

    const rechartsLinks = links
      .filter((l) => oldToNew.has(l.source) && oldToNew.has(l.target))
      .map((l) => ({
        source: oldToNew.get(l.source) as number,
        target: oldToNew.get(l.target) as number,
        // Sensible flow magnitude: use the mapping weight when present, else 1
        // so the connection is still drawn (Req 11.2).
        value: l.value > 0 ? l.value : 1,
      }));

    return {
      data: {
        nodes: connected.map((n) => ({ name: n.name })),
        links: rechartsLinks,
      },
      colors: connected.map((n) => n.color),
    };
  }, [nodes, links]);

  // Custom node: keeps the existing per-outcome (attainment) coloring and draws
  // a readable label outside the node rectangle.
  const renderNode = (nodeProps: SankeyNodeProps) => {
    const { x, y, width, height, index, payload } = nodeProps;
    const color = colors[index] ?? FALLBACK_NODE_COLOR;
    // A node with no outgoing links is a sink (rightmost column) — label it on
    // the left so the text stays inside the chart area.
    const isSink = payload.sourceLinks.length === 0;
    const labelX = isSink ? x - 6 : x + width + 6;
    const name =
      payload.name.length > 22
        ? `${payload.name.slice(0, 21)}\u2026`
        : payload.name;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity={0.9}
          rx={2}
        />
        <text
          x={labelX}
          y={y + height / 2}
          textAnchor={isSink ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={10}
          fill="#334155"
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-8 justify-center text-xs text-slate-500">
        <span>CLOs → PLOs → ILOs</span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <Sankey
          data={data}
          node={renderNode}
          nodePadding={24}
          nodeWidth={12}
          margin={{ top: 8, right: 120, bottom: 8, left: 120 }}
          link={{ stroke: "#cbd5e1" }}
        >
          <Tooltip isAnimationActive={!prefersReducedMotion} />
        </Sankey>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 text-center">
        {nodes.length} outcomes · {links.length} mappings
      </p>
    </div>
  );
};

// ── Fallback: "Outcome Mapping" columns (no links to draw, Req 11.3/11.4) ────
// The term "Sankey" must not appear in any user-facing string in this branch.

interface OutcomeMappingColumnsProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const OutcomeMappingColumns = ({
  nodes,
  links,
}: OutcomeMappingColumnsProps) => (
  <div className="space-y-4">
    <div className="flex gap-8 justify-center text-xs text-slate-500">
      <span>CLOs → PLOs → ILOs</span>
    </div>
    {/* Outcome mapping — nodes grouped by type */}
    <div className="grid grid-cols-3 gap-4 min-h-[300px]">
      {(["CLO", "PLO", "ILO"] as const).map((type) => (
        <div key={type} className="space-y-2">
          <p className="text-xs font-black tracking-widest uppercase text-slate-400 text-center">
            {type}s
          </p>
          {nodes
            .filter((n) => n.type === type)
            .map((node) => (
              <div
                key={node.id}
                className="p-2 rounded-lg border text-xs"
                style={{
                  borderColor: node.color,
                  backgroundColor: `${node.color}15`,
                }}
              >
                <p
                  className="font-medium truncate"
                  style={{ color: node.color }}
                >
                  {node.name}
                </p>
                <p className="text-slate-500">{Math.round(node.attainment)}%</p>
              </div>
            ))}
        </div>
      ))}
    </div>
    <p className="text-xs text-slate-400 text-center">
      {nodes.length} outcomes · {links.length} mappings
    </p>
  </div>
);

const SankeyDiagramView = () => {
  const [programId, setProgramId] = useQueryState(
    "program",
    parseAsString.withDefault("")
  );
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const {
    data: sankeyData,
    isLoading,
    isError,
  } = useSankeyData(programId || undefined);

  const nodeCount = sankeyData?.nodes.length ?? 0;
  const linkCount = sankeyData?.links.length ?? 0;
  // "Sankey" wording is only used when a genuine flow diagram is on screen.
  // Every other state (incl. the empty-links relabel fallback) reads
  // "Outcome Mapping" so the term never appears outside the real diagram.
  const showRealSankey =
    !!programId && !isLoading && nodeCount > 0 && linkCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {showRealSankey ? "Outcome Flow (Sankey)" : "Outcome Mapping"}
        </h1>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <GitBranch className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Outcome Mapping Flow
          </h2>
        </div>
        <div className="p-6">
          {!programId ? (
            <p className="text-sm text-slate-400 text-center py-12">
              Select a program to view the outcome flow diagram.
            </p>
          ) : isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : isError ? (
            <InlineLoadError className="py-12" />
          ) : !sankeyData || sankeyData.nodes.length === 0 ? (
            <NoOutcomes className="py-12" />
          ) : sankeyData.links.length === 0 ? (
            // Req 11.3: no links to draw → "Outcome Mapping" relabel fallback.
            <OutcomeMappingColumns
              nodes={sankeyData.nodes}
              links={sankeyData.links}
            />
          ) : (
            // Req 11.2: real recharts Sankey drawing each mapping as a flow.
            <SankeyFlow nodes={sankeyData.nodes} links={sankeyData.links} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default SankeyDiagramView;
