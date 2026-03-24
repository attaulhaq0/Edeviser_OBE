// =============================================================================
// ExportDataButton — Button to trigger CSV/PDF export
// =============================================================================

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ExportFormat = 'csv' | 'pdf' | 'json';

interface ExportDataButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  formats?: ExportFormat[];
  label?: string;
  className?: string;
}

const ExportDataButton = ({
  onExport,
  formats = ['csv', 'pdf'],
  label = 'Export',
  className,
}: ExportDataButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setActiveFormat(format);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
      setActiveFormat(null);
    }
  };

  if (formats.length === 1) {
    return (
      <Button
        variant="outline"
        onClick={() => handleExport(formats[0]!)}
        disabled={isExporting}
        className={cn(className)}
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {label}
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {formats.map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          onClick={() => handleExport(format)}
          disabled={isExporting}
        >
          {isExporting && activeFormat === format ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {format.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

export default ExportDataButton;
export type { ExportDataButtonProps, ExportFormat };
