import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export interface TimetableSlot {
  id: string;
  section_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;
  end_time: string;
  room: string | null;
  slot_type: string;
  course_name?: string;
  section_code?: string;
  course_id?: string;
  color?: string;
}

export interface CreateTimetableSlotInput {
  section_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  slot_type: "lecture" | "lab" | "tutorial";
}

const SLOT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
];

/**
 * Fetch timetable slots for the current user.
 * Students: slots from enrolled sections.
 * Teachers: slots from assigned sections.
 */
export const useTimetableSlots = () => {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: queryKeys.timetableSlots.list({ userId: user?.id, role }),
    queryFn: async (): Promise<TimetableSlot[]> => {
      if (!user) return [];

      let sectionIds: string[] = [];

      if (role === "student") {
        // Get sections from enrolled courses
        const { data: enrollments } = await supabase
          .from("student_courses")
          .select("section_id")
          .eq("student_id", user.id)
          .not("section_id", "is", null);
        sectionIds = (enrollments ?? [])
          .map((e) => e.section_id)
          .filter((id): id is string => !!id);
      } else if (role === "teacher") {
        // Get sections assigned to teacher
        const { data: sections } = await supabase
          .from("course_sections")
          .select("id")
          .eq("teacher_id", user.id);
        sectionIds = (sections ?? []).map((s) => s.id);
      }

      if (sectionIds.length === 0) {
        // Fallback: fetch all visible slots (RLS will scope)
        const { data, error } = await supabase
          .from("timetable_slots")
          .select("*")
          .order("day_of_week")
          .order("start_time");
        if (error) throw error;
        return (data ?? []) as TimetableSlot[];
      }

      // Fetch slots for the user's sections
      const { data: slots, error } = await supabase
        .from("timetable_slots")
        .select("*")
        .in("section_id", sectionIds)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;

      // Fetch section + course info for enrichment
      const { data: sections } = await supabase
        .from("course_sections")
        .select("id, section_code, course_id, courses(name)")
        .in("id", sectionIds);

      const sectionMap = new Map<
        string,
        { section_code: string; course_name: string; course_id: string }
      >();
      const courseColorMap = new Map<string, string>();
      let colorIdx = 0;

      (sections ?? []).forEach((s) => {
        const courseName = (s.courses as { name: string } | null)?.name ?? "";
        const courseId = s.course_id as string;
        if (!courseColorMap.has(courseId)) {
          courseColorMap.set(
            courseId,
            SLOT_COLORS[colorIdx % SLOT_COLORS.length] ?? "#3b82f6"
          );
          colorIdx++;
        }
        sectionMap.set(s.id, {
          section_code: s.section_code,
          course_name: courseName,
          course_id: courseId,
        });
      });

      return (slots ?? []).map((slot) => {
        const info = sectionMap.get(slot.section_id);
        return {
          ...slot,
          course_name: info?.course_name ?? "",
          section_code: info?.section_code ?? "",
          course_id: info?.course_id ?? "",
          color: info?.course_id
            ? courseColorMap.get(info.course_id)
            : undefined,
        } as TimetableSlot;
      });
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
};

/**
 * Fetch all timetable slots for a specific section (admin/coordinator use).
 */
export const useSectionTimetableSlots = (sectionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.timetableSlots.detail(sectionId ?? ""),
    queryFn: async (): Promise<TimetableSlot[]> => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("*")
        .eq("section_id", sectionId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as TimetableSlot[];
    },
    enabled: !!sectionId,
    staleTime: 5 * 60_000,
  });
};

/**
 * Create a new timetable slot.
 */
export const useCreateTimetableSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTimetableSlotInput) => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetableSlots.all });
    },
  });
};

/**
 * Update an existing timetable slot.
 */
export const useUpdateTimetableSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateTimetableSlotInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetableSlots.all });
    },
  });
};

/**
 * Delete a timetable slot.
 */
export const useDeleteTimetableSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("timetable_slots")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetableSlots.all });
    },
  });
};
