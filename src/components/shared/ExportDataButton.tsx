// =============================================================================
// ExportDataButton — GDPR data export with format selector + download trigger
// =============================================================================

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ExportFormat = "json" | "csv";

interface ExportDataButtonProps {
  studentId: string;
  className?: string;
}

const ExportDataButton = ({ studentId, className }: ExportDataButtonProps) => {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "export-student-data",
        {
          body: { student_id: studentId, format },
        }
      );

      if (error) throw new Error(error.message);
      if (!data?.download_url) throw new Error("No download URL returned");

      // Open the signed URL to trigger download
      const win = window.open(data.download_url, "_blank");
      if (!win) {
        // Popup blocked — fallback to anchor click
        const a = document.createElement("a");
        a.href = data.download_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={format}
        onValueChange={(v) => setFormat(v as ExportFormat)}
      >
        <SelectTrigger aria-label="Export format" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="json">JSON</SelectItem>
          <SelectItem value="csv">CSV</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={isExporting}
        aria-label="Download my data"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download My Data
      </Button>
    </div>
  );
};

export default ExportDataButton;
export type { ExportDataButtonProps, ExportFormat };
