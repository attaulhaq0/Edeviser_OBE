// CriterionStrategyInput.tsx — IB MYP 0-8 criterion-based assessment input
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface S { id: string; name: string; level: number; maxLevel: number; }

export function CriterionStrategyInput({ onSubmit, disabled }: { onSubmit: (native: Record<string, unknown>) => void; disabled?: boolean }) {
  const [criteria, setCriteria] = useState<S[]>([{ id: "A", name: "", level: 0, maxLevel: 8 }]);
  const upd = (i: number, p: Partial<S>) => setCriteria(criteria.map((c, j) => j === i ? { ...c, ...p } : c));
  return (
    <div className="space-y-3">
      {criteria.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-end">
          <div><Label>Criterion {c.id}</Label><Input value={c.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Name" /></div>
          <div><Label>Level</Label>
            <Select value={String(c.level)} onValueChange={(v) => upd(i, { level: Number(v) })}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 9 }, (_, j) => <SelectItem key={j} value={String(j)}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Max</Label>
            <Select value={String(c.maxLevel)} onValueChange={(v) => upd(i, { maxLevel: Number(v) })}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>{[4, 5, 6, 7, 8].map((j) => <SelectItem key={j} value={String(j)}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {criteria.length > 1 && <Button variant="ghost" size="icon" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ))}
      {criteria.length < 6 && <Button variant="outline" size="sm" onClick={() => setCriteria([...criteria, { id: String.fromCharCode(65 + criteria.length), name: "", level: 0, maxLevel: 8 }])}><Plus className="h-4 w-4 me-1" />Add Criterion</Button>}
      <Button onClick={() => onSubmit({ criteria: criteria.map((c) => ({ criterionId: c.id, criterionName: c.name || c.id, level: c.level, maxLevel: c.maxLevel })) })} disabled={disabled}>Submit Criterion Assessment</Button>
    </div>
  );
}