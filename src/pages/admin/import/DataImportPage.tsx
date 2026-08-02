import { useMemo, useState } from "react";
import { Download, FileText, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecentAuditLogs } from "@/hooks/useAdminDashboard";
import { useDataImport, type ImportResult } from "@/hooks/useDataImport";
import {
  AdminFilterPill,
  AdminSectionHeader,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
  adminTableClass,
} from "@/components/shared/AdminPrototypePrimitives";

const IMPORT_TYPES = [
  {
    value: "users",
    label: "Users",
    template: "/docs/import-templates/users.csv",
  },
  {
    value: "courses",
    label: "Courses",
    template: "/docs/import-templates/courses.csv",
  },
  {
    value: "enrollments",
    label: "Enrollments",
    template: "/docs/import-templates/enrollments.csv",
  },
  {
    value: "grades",
    label: "Grades",
    template: "/docs/import-templates/grades.csv",
  },
] as const;

const DataImportPage = () => {
  const [importType, setImportType] =
    useState<(typeof IMPORT_TYPES)[number]["value"]>("users");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const importMutation = useDataImport();
  const auditLogs = useRecentAuditLogs(20);
  const selectedTemplate = useMemo(
    () => IMPORT_TYPES.find((item) => item.value === importType),
    [importType]
  );
  const recentImports = (auditLogs.data ?? []).filter(
    (log) => log.action === "bulk_import"
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    const text = await selectedFile.text();
    setPreview(
      text
        .trim()
        .split("\n")
        .slice(0, 6)
        .map((line) => line.split(",").map((value) => value.trim()))
    );
  };

  const handleImport = async () => {
    if (!file) return;
    const text = await file.text();
    importMutation.mutate(
      { import_type: importType, csv_content: text },
      {
        onSuccess: (result: ImportResult) => {
          toast.success(
            `Imported ${result.imported} of ${result.total_rows} rows`
          );
          if (result.errors.length > 0)
            toast.error(
              `${result.skipped} rows skipped — check the errors below`
            );
        },
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className={adminPageClass}>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Bulk Import
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Import users, courses, enrollments or grades from a CSV file.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {IMPORT_TYPES.map((item) => (
          <AdminFilterPill
            key={item.value}
            active={item.value === importType}
            onClick={() => {
              setImportType(item.value);
              setFile(null);
              setPreview([]);
            }}
          >
            {item.label}
          </AdminFilterPill>
        ))}
      </div>

      <div className={`${adminCardClass} p-4`}>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center">
          <Upload className="mx-auto size-8 text-sky-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-slate-900">
            Drop a {selectedTemplate?.label} CSV here or select a file
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Max 10,000 rows per file · UTF-8 CSV
          </p>
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="mx-auto mt-4 max-w-sm bg-white text-xs"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            asChild
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs font-bold text-blue-600"
          >
            <a href={selectedTemplate?.template} download>
              <Download className="size-4" /> Download{" "}
              {selectedTemplate?.label.toLowerCase()} template
            </a>
          </Button>
          <Button
            type="button"
            variant="tactile"
            size="sm"
            disabled={!file || importMutation.isPending}
            onClick={handleImport}
          >
            <FileText className="size-4" />{" "}
            {importMutation.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>

      {preview.length > 0 ? (
        <div className={`${adminCardClass} overflow-hidden p-4`}>
          <AdminSectionHeader
            emoji="🔎"
            title={`Preview · ${file?.name ?? "CSV"}`}
          />
          <div className="mt-3 overflow-x-auto">
            <table className={adminTableClass}>
              <thead>
                <tr>
                  {preview[0]?.map((header, index) => (
                    <th
                      key={index}
                      className="border-b border-slate-200 px-2 py-2 text-start text-[10px] font-black uppercase tracking-wider text-slate-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-2 py-2 text-xs text-slate-600"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {importMutation.data ? (
        <div className={`${adminCardClass} p-4`}>
          <AdminSectionHeader emoji="📦" title="Import result" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Rows
              </p>
              <p className="text-2xl font-black text-slate-900">
                {importMutation.data.total_rows}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Imported
              </p>
              <p className="text-2xl font-black text-emerald-600">
                {importMutation.data.imported}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Skipped
              </p>
              <p className="text-2xl font-black text-red-600">
                {importMutation.data.skipped}
              </p>
            </div>
          </div>
          {importMutation.data.errors.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {importMutation.data.errors.map((error) => (
                <div
                  key={`${error.row}-${error.message}`}
                  className="flex items-center gap-2 text-xs text-slate-600"
                >
                  <XCircle className="size-4 text-red-500" />
                  Row {error.row}: {error.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-emerald-600">
              All rows imported successfully.
            </p>
          )}
        </div>
      ) : null}

      <div className={`${adminCardClass} overflow-hidden p-4`}>
        <AdminSectionHeader emoji="🗂️" title="Recent imports" />
        <div className="mt-3 overflow-x-auto">
          <table className={adminTableClass}>
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-2 py-2 text-start">Import</th>
                <th className="px-2 py-2 text-start">Type</th>
                <th className="px-2 py-2 text-start">Status</th>
                <th className="px-2 py-2 text-start">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentImports.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="px-2 py-3 font-semibold text-slate-900">
                    {log.entity_id ?? "bulk"}
                  </td>
                  <td className="px-2 py-3 text-slate-500">
                    {log.entity_type}
                  </td>
                  <td className="px-2 py-3">
                    <AdminStatusPill tone="green">Completed</AdminStatusPill>
                  </td>
                  <td className="px-2 py-3 text-slate-500">
                    {new Date(log.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!auditLogs.isLoading && recentImports.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No import history has been recorded yet.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default DataImportPage;
