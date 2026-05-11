import { Info } from "lucide-react";

const CorrelationDisclaimer = () => (
  <div
    className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3"
    data-testid="correlation-disclaimer"
  >
    <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
    <p className="text-xs text-slate-600">
      These insights show patterns in your data, not cause-and-effect
      relationships. Many factors influence academic performance.
    </p>
  </div>
);

export default CorrelationDisclaimer;
