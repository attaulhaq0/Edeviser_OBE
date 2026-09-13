// BandGradeStrategyInput.tsx — IGCSE 9-1/A*-G band-grade assessment input
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function BandGradeStrategyInput({ onSubmit, disabled }: { onSubmit: (native: Record<string, unknown>) => void; disabled?: boolean }) {
  const [rawMark, setRawMark] = useState("");
  const [maxMark, setMaxMark] = useState("");
  const [componentCode, setComponentCode] = useState("");
  const [weight, setWeight] = useState("100");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Raw Mark</Label><Input type="number" min="0" value={rawMark} onChange={(e) => setRawMark(e.target.value)} disabled={disabled} placeholder="0" /></div>
        <div><Label>Max Mark</Label><Input type="number" min="1" value={maxMark} onChange={(e) => setMaxMark(e.target.value)} disabled={disabled} placeholder="80" /></div>
        <div><Label>Component Code</Label><Input value={componentCode} onChange={(e) => setComponentCode(e.target.value)} disabled={disabled} placeholder="Paper 1" /></div>
        <div><Label>Weight %</Label><Input type="number" min="0" max="100" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={disabled} placeholder="100" /></div>
      </div>
      <Button onClick={() => onSubmit({ rawMark: Number(rawMark), maxMark: Number(maxMark) || 1, componentCode: componentCode || undefined, weightingPercent: Number(weight) || 100 })} disabled={disabled || !rawMark}>Submit Band Grade</Button>
    </div>
  );
}