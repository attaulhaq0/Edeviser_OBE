// PercentStrategyInput.tsx — MoEHE / General percentage-based assessment input
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PercentStrategyInput({ onSubmit, disabled }: { onSubmit: (native: Record<string, unknown>) => void; disabled?: boolean }) {
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Score</Label><Input type="number" min="0" value={score} onChange={(e) => setScore(e.target.value)} disabled={disabled} placeholder="0" /></div>
        <div><Label>Max Score</Label><Input type="number" min="1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} disabled={disabled} placeholder="100" /></div>
      </div>
      <Button onClick={() => onSubmit({ score: Number(score), maxScore: Number(maxScore) || 100 })} disabled={disabled || !score}>Submit Score</Button>
    </div>
  );
}