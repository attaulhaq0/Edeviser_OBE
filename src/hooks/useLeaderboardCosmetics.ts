// =============================================================================
// useLeaderboardCosmetics — Fetch equipped cosmetics for leaderboard rendering
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardCosmeticData {
  studentId: string;
  avatarFrame: {
    border_color: string;
    border_width: string;
    border_style?: string;
    box_shadow?: string;
  } | null;
  displayTitle: {
    title_text: string;
    title_color: string;
  } | null;
}

/**
 * Narrows a Supabase `Json` value to a plain string-keyed record. Returns an
 * empty record for arrays, primitives, or null so callers can read optional
 * cosmetic fields without unsafe casts.
 */
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Reads an optional string field from a narrowed metadata record. */
const readString = (
  record: Record<string, unknown>,
  key: string
): string | undefined =>
  typeof record[key] === "string" ? (record[key] as string) : undefined;

// ─── useLeaderboardCosmetics — batch fetch cosmetics for leaderboard entries ─

export const useLeaderboardCosmetics = (studentIds: string[]) => {
  return useQuery({
    queryKey: queryKeys.leaderboardCosmetics.list({
      studentIds: studentIds.slice(0, 5).join(","),
    }),
    queryFn: async (): Promise<Map<string, LeaderboardCosmeticData>> => {
      if (studentIds.length === 0) return new Map();

      // Fetch equipped items for all students in the leaderboard
      const { data, error } = await supabase
        .from("student_equipped_items")
        .select(
          `
          student_id,
          slot,
          xp_purchases:purchase_id (
            marketplace_items:item_id (
              metadata,
              name
            )
          )
        `
        )
        .in("student_id", studentIds)
        .in("slot", ["avatar_frame", "display_title"]);

      if (error) throw error;

      const cosmeticMap = new Map<string, LeaderboardCosmeticData>();

      // Initialize all students with defaults
      for (const id of studentIds) {
        cosmeticMap.set(id, {
          studentId: id,
          avatarFrame: null,
          displayTitle: null,
        });
      }

      // Populate from query results. Embedded relations are to-one objects (or
      // null); a missing join collapses to empty metadata via `asRecord`.
      for (const row of data ?? []) {
        const studentId = row.student_id;
        const slot = row.slot;
        const purchase = Array.isArray(row.xp_purchases)
          ? row.xp_purchases[0]
          : row.xp_purchases;
        const item = Array.isArray(purchase?.marketplace_items)
          ? purchase?.marketplace_items[0]
          : purchase?.marketplace_items;
        const metadata = asRecord(item?.metadata);

        const existing = cosmeticMap.get(studentId) ?? {
          studentId,
          avatarFrame: null,
          displayTitle: null,
        };

        if (slot === "avatar_frame") {
          existing.avatarFrame = {
            border_color: readString(metadata, "border_color") ?? "#3b82f6",
            border_width: readString(metadata, "border_width") ?? "3px",
            border_style: readString(metadata, "border_style") ?? "solid",
            box_shadow: readString(metadata, "box_shadow"),
          };
        } else if (slot === "display_title") {
          existing.displayTitle = {
            title_text: readString(metadata, "title_text") ?? item?.name ?? "",
            title_color: readString(metadata, "title_color") ?? "#6366f1",
          };
        }

        cosmeticMap.set(studentId, existing);
      }

      return cosmeticMap;
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });
};
