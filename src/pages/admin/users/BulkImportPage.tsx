import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { csvRowSchema, type CSVRowData } from '@/lib/schemas/bulkImport';
import { useBulkImportUsers, type BulkImportResult } from '@/hooks/useBulkImport';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const MAX_ROWS = 1000;

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  parsed: CSVRowData | null;
  errors: string[];
  isValid: boolean;
}

type Step = 'upload' | 'preview' | 'result';

/** Simple CSV parser — handles quoted fields */
const parseCSV = (text: string): Array<Record<string, string>> => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0] ?? '';
  const headers = headerLine
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ?? '';
      });
      return row;
    });
};

/** Validate rows against Zod schema */
const validateRows = (rawRows: Array<Record<string, string>>): ParsedRow[] => {
  return rawRows.map((data, index) => {
    const result = csvRowSchema.safeParse({
      email: data.email ?? '',
      full_name: data.full_name ?? '',
      role: data.role ?? '',
      program_id: data.program_id || undefined,
    });

    if (result.success) {
      return { rowNumber: index + 2, data, parsed: result.data, errors: [], isValid: true };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    return { rowNumber: index + 2, data, parsed: null, errors, isValid: false };
  });
};

const BulkImportPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const importMutation = useBulkImportUsers();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rawRows = parseCSV(text);

      if (rawRows.length === 0) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }

      if (rawRows.length > MAX_ROWS) {
        toast.error(`CSV exceeds maximum of ${MAX_ROWS} rows. Found ${rawRows.length} rows.`);
        return;
      }

      const validated = validateRows(rawRows);
      setParsedRows(validated);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleImport = () => {
    if (validRows.length === 0) return;

    const rows = validRows.map((r) => r.parsed!);
    importMutation.mutate(rows, {
      onSuccess: (result) => {
        setImportResult(result);
        setStep('result');
        toast.success(`${result.created} users imported successfully`);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleReset = () => {
    setStep('upload');
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Import Users</h1>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <FileUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              Drag and drop a CSV file here, or click to browse
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Required columns: email, full_name, role. Optional: program_id. Max {MAX_ROWS} rows.
            </p>
            <label>
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4" /> Choose File
                </span>
              </Button>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          </div>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              {validRows.length} valid
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
              {invalidRows.length} invalid
            </Badge>
            <span className="text-sm text-slate-500">{parsedRows.length} total rows</span>
          </div>

          {/* Preview Table */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Program ID</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row.rowNumber} className={row.isValid ? '' : 'bg-red-50/50'}>
                      <TableCell className="text-slate-500">{row.rowNumber}</TableCell>
                      <TableCell>{row.data.email}</TableCell>
                      <TableCell>{row.data.full_name}</TableCell>
                      <TableCell>{row.data.role}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {row.data.program_id || '—'}
                      </TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-600 border-green-200"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200"
                          >
                            <XCircle className="h-3 w-3" /> Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-red-600">
                        {row.errors.join('; ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {validRows.length} Valid Users
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={importMutation.isPending}>
              Cancel
            </Button>
          </div>

          {/* Warning for invalid rows */}
          {invalidRows.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {invalidRows.length} invalid rows will be skipped. Only valid rows will be imported.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && importResult && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-bold">Import Complete</h2>
            <p className="text-sm text-slate-600">
              {importResult.created} users created successfully.
              {importResult.errors.length > 0 &&
                ` ${importResult.errors.length} rows had server-side errors.`}
            </p>
          </div>

          {/* Server-side errors */}
          {importResult.errors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Server Errors</h3>
              <div className="max-h-48 overflow-auto rounded-lg border border-red-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.errors.map((err) => (
                      <TableRow key={err.row}>
                        <TableCell>{err.row}</TableCell>
                        <TableCell className="text-sm text-red-600">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 justify-center">
            <Button
              onClick={() => navigate('/admin/users')}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              View Users
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Import More
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkImportPage;
