// Task 108.3: Data Import UI — CSV upload with type selector, preview, and results

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Download, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDataImport, type ImportResult } from '@/hooks/useDataImport';

const IMPORT_TYPES = [
  { value: 'courses', label: 'Courses', template: '/docs/import-templates/courses.csv' },
  { value: 'outcomes', label: 'Outcomes (ILO/PLO/CLO)', template: '/docs/import-templates/outcomes.csv' },
  { value: 'grades', label: 'Grades', template: '/docs/import-templates/grades.csv' },
  { value: 'enrollments', label: 'Enrollments', template: '/docs/import-templates/enrollments.csv' },
] as const;

const DataImportPage = () => {
  const [importType, setImportType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const importMutation = useDataImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    // Parse preview (first 5 rows)
    const text = await f.text();
    const lines = text.trim().split('\n').slice(0, 6);
    setPreview(lines.map((line) => line.split(',').map((v) => v.trim())));
  };

  const handleImport = async () => {
    if (!file || !importType) return;
    const text = await file.text();
    importMutation.mutate(
      { import_type: importType, csv_content: text },
      {
        onSuccess: (result: ImportResult) => {
          toast.success(`Imported ${result.imported} of ${result.total_rows} rows`);
          if (result.errors.length > 0) {
            toast.error(`${result.skipped} rows skipped — check error report`);
          }
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const selectedTemplate = IMPORT_TYPES.find((t) => t.value === importType);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Data Import</h1>

      {/* Import type selector */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="import-type-select" className="text-sm font-medium text-gray-700 mb-1 block">Import Type</label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger id="import-type-select" className="bg-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="pt-5">
              <a
                href={selectedTemplate.template}
                download
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* File upload */}
      {importType && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
            }}
          >
            <Upload className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Upload CSV</h2>
          </div>
          <div className="p-6 space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-md"
            />

            {/* Preview table */}
            {preview.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs text-slate-500 mb-2">
                  Preview (first {Math.min(preview.length - 1, 5)} rows):
                </p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {preview[0]?.map((header, i) => (
                        <th
                          key={i}
                          className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold text-left"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-2 border border-slate-200 text-slate-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Import
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {importMutation.data && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">Import Results</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Total Rows
              </p>
              <p className="text-2xl font-black">{importMutation.data.total_rows}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Imported
              </p>
              <p className="text-2xl font-black text-green-600">
                {importMutation.data.imported}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Skipped
              </p>
              <p className="text-2xl font-black text-red-600">
                {importMutation.data.skipped}
              </p>
            </div>
          </div>

          {importMutation.data.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
              {importMutation.data.errors.map((err: { row: number; message: string }, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="text-slate-500">Row {err.row}:</span>
                  <span className="text-slate-700">{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {importMutation.data.errors.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              All rows imported successfully
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default DataImportPage;
