// Task 108.4: Data import TanStack Query hooks

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { logAuditEvent } from "@/lib/auditLogger";

export interface ImportRequest {
  import_type: string;
  csv_content: string;
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

const parseCsvRows = (text: string): Array<Record<string, string>> => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (const character of text.replace(/\r/g, "")) {
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if (character === "\n" && !quoted) {
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() ?? []).map((header) => header.toLowerCase());
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    )
  );
};

export const useDataImport = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (req: ImportRequest): Promise<ImportResult> => {
      if (req.import_type === "users") {
        const rows = parseCsvRows(req.csv_content).map((row) => ({
          email: row.email ?? "",
          full_name: row.full_name ?? "",
          role: row.role ?? "",
          ...(row.program_id ? { program_id: row.program_id } : {}),
        }));
        const { data, error } = await supabase.functions.invoke(
          "bulk-import-users",
          { body: { rows } }
        );
        if (error) throw error;
        const result = data as {
          created: number;
          errors: Array<{ row: number; message: string }>;
        };
        await logAuditEvent({
          action: "bulk_import",
          entity_type: "users",
          entity_id: "bulk",
          changes: {
            total: rows.length,
            imported: result.created,
            skipped: result.errors.length,
          },
          performed_by: user?.id ?? "unknown",
        });
        return {
          total_rows: rows.length,
          imported: result.created,
          skipped: result.errors.length,
          errors: result.errors,
        };
      }
      const { data, error } = await supabase.functions.invoke(
        "bulk-data-import",
        {
          body: { ...req, performed_by: user?.id },
        }
      );
      if (error) throw error;
      return data as ImportResult;
    },
  });
};
