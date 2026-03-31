// Task 92.3: Global search hook — full-text search across courses, assignments, announcements

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { UserRole } from '@/types/app';

export interface SearchResult {
  id: string;
  type: 'course' | 'assignment' | 'announcement';
  title: string;
  description: string | null;
  url: string;
}

const searchCourses = async (query: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, code')
    .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
    .limit(5);

  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    type: 'course' as const,
    title: `${c.code} — ${c.name}`,
    description: null,
    url: `/courses/${c.id}`,
  }));
};

const searchAssignments = async (query: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, description')
    .ilike('title', `%${query}%`)
    .limit(5);

  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    type: 'assignment' as const,
    title: a.title,
    description: a.description,
    url: `/assignments/${a.id}`,
  }));
};

const searchAnnouncements = async (query: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content')
    .ilike('title', `%${query}%`)
    .limit(5);

  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    type: 'announcement' as const,
    title: a.title,
    description: a.content ? String(a.content).slice(0, 100) : null,
    url: `/announcements/${a.id}`,
  }));
};

export const useGlobalSearch = (query: string, role: UserRole | null) => {
  return useQuery({
    queryKey: queryKeys.globalSearch.list({ query, role }),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];

      const results = await Promise.all([
        searchCourses(query),
        // Students and parents may not search assignments directly in some scopes,
        // but RLS handles visibility — include for all roles
        searchAssignments(query),
        searchAnnouncements(query),
      ]);

      return results.flat();
    },
    enabled: !!query && query.length >= 2 && !!role,
    staleTime: 30_000,
  });
};
