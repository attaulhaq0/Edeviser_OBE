import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Institution data for browsing during signup
 */
export interface BrowsableInstitution {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  join_mode: "open" | "invite_only" | "domain_restricted";
}

/**
 * Return type for useInstitutionBrowse
 */
interface UseInstitutionBrowseReturn {
  /** List of institutions available for signup */
  data: BrowsableInstitution[] | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
}

/**
 * Hook for browsing institutions during signup
 *
 * Queries the public `institutions_public` view which exposes:
 * - id
 * - slug
 * - name
 * - logo_url
 * - join_mode
 *
 * This view is accessible to unauthenticated users (public-anon SELECT policy).
 *
 * Caching strategy:
 * - staleTime: 5 minutes (institutions don't change frequently)
 * - gcTime: 10 minutes (keep in cache for 10 minutes after last use)
 *
 * Usage:
 * ```tsx
 * const { data: institutions, isLoading, error } = useInstitutionBrowse();
 *
 * return (
 *   <div>
 *     {isLoading && <p>Loading institutions...</p>}
 *     {error && <p>Error: {error.message}</p>}
 *     {institutions?.map((inst) => (
 *       <div key={inst.id}>
 *         {inst.logo_url && <img src={inst.logo_url} alt={inst.name} />}
 *         <h3>{inst.name}</h3>
 *         <p>{inst.join_mode}</p>
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export const useInstitutionBrowse = (): UseInstitutionBrowseReturn => {
  const query = useQuery({
    queryKey: queryKeys.institutions.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions_public")
        .select("id, slug, name, logo_url, join_mode")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []) as BrowsableInstitution[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
