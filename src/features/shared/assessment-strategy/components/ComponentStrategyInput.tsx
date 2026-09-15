// ComponentStrategyInput.tsx — AO-weighted multi-component assessment input
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface S { id: string; name: string; objectiveCode: string; score: number; maxScore: number; weightPercent: number; }

export function ComponentStrategyInput({ onSubmit, disabled }: { onSubmit: (native: Record<string, unknown>) => void; disabled?: boolean }) {
  const [components, setComponents] = useState<S[]>([{ id: "AO1", name: "", objectiveCode: "AO1", score: 0, maxScore: 100, weightPercent: 100 }]);
  const upd = (i: number, p: Partial<S>) => setComponents(components.map((c, j) => j === i ? { ...c, ...p } : c));
  return (
    <div className="space-y-3">
      {components.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-2 items-end">
          <div><Label>Name</Label><Input value={c.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Knowledge" /></div>
          <div><Label>AO</Label><Input className="w-16" value={c.objectiveCode} onChange={(e) => upd(i, { objectiveCode: e.target.value })} /></div>
          <div><Label>Score</Label><Input className="w-20" type="number" min="0" value={c.score || ""} onChange={(e) => upd(i, { score: Number(e.target.value) })} /></div>
          <div><Label>Max</Label><Input className="w-16" type="number" min="1" value={c.maxScore} onChange={(e) => upd(i, { maxScore: Number(e.target.value) || 100 })} /></div>
          <div><Label>Wt%</Label><Input className="w-16" type="number" min="0" max="100" value={c.weightPercent} onChange={(e) => upd(i, { weightPercent: Number(e.target.value) })} /></div>
        </div>
      ))}
      {components.length < 6 && <Button variant="outline" size="sm" onClick={() => setComponents([...components, { id: `AO${components.length + 1}`, name: "", objectiveCode: `AO${components.length + 1}`, score: 0, maxScore: 100, weightPercent: 0 }])}><Plus className="h-4 w-4 me-1" />Add</Button>}
      <Button onClick={() => onSubmit({ components: components.map((c) => ({ componentId: c.id, componentName: c.name || c.objectiveCode, objectiveCode: c.objectiveCode, score: c.score, maxScore: c.maxScore, weightPercent: c.weightPercent })) })} disabled={disabled}>Submit AO-Weighted</Button>
    </div>
  );
}