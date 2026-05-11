// Task 108.4: Data import TanStack Query hooks

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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

export const useDataImport = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (req: ImportRequest): Promise<ImportResult> => {
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
