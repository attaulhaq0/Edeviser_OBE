import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface InstitutionProfile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  accreditation_body: string | null;
  created_at: string;
}

export const useInstitutionProfile = (institutionId?: string | null) =>
  useQuery({
    queryKey: queryKeys.institutions.detail(institutionId ?? ""),
    enabled: Boolean(institutionId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<InstitutionProfile | null> => {
      if (!institutionId) return null;

      const { data, error } = await supabase
        .from("institutions")
        .select("id, name, slug, logo_url, accreditation_body, created_at")
        .eq("id", institutionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
