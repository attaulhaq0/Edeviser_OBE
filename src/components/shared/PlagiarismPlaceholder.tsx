import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

interface PlagiarismPlaceholderProps {
  score?: number | null;
}

const PlagiarismPlaceholder = ({ score }: PlagiarismPlaceholderProps) => {
  if (score != null) {
    const color =
      score > 30
        ? "text-red-600 bg-red-50"
        : score > 10
        ? "text-yellow-600 bg-yellow-50"
        : "text-green-600 bg-green-50";
    return (
      <Badge variant="outline" className={`${color} gap-1`}>
        <ShieldAlert className="h-3 w-3" />
        Similarity: {score.toFixed(0)}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-slate-400 bg-slate-50 gap-1">
      <ShieldAlert className="h-3 w-3" />
      Plagiarism check: Not configured
    </Badge>
  );
};

export default PlagiarismPlaceholder;
