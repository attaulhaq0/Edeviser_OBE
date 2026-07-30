// =============================================================================
// useFriends — student peer connections (friends), presence & leaderboard
// =============================================================================
//
// Backs the student Friends page, the dashboard "Friends online" rail, and the
// friends-scoped leaderboard. Mutual friend-request model (see migration
// 20260823000010_create_friendships.sql): requests + accepts go through the
// fail-closed SECURITY DEFINER RPCs `send_friend_request` / `respond_friend_request`
// (which also create the cross-user notification); reads use the existing
// same-institution SELECT policies on profiles / student_gamification.
//
// `friendships` and its RPCs are added by that migration and are not in the
// generated Database types until regenerated post-merge, so those specific calls
// use an untyped view of the client (same pattern as the dashboard aggregates /
// get_xp_balance). The typed client is still used for profiles / gamification.
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as any;

/** A student is considered "online" if seen within this window. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isOnline = (lastSeenAt: string | null): boolean => {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  return Number.isFinite(seen) && Date.now() - seen < ONLINE_WINDOW_MS;
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Friend {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  xp_total: number;
  level: number;
  streak_current: number;
  online: boolean;
}

export interface IncomingFriendRequest {
  friendship_id: string;
  requester_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ClassmateResult {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface FriendRankRow {
  student_id: string;
  full_name: string;
  xp_total: number;
  level: number;
  isMe: boolean;
  rank: number;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  created_at: string;
}

/** Collect the "other party" ids from a set of the caller's friendship rows. */
const otherIds = (rows: FriendshipRow[], me: string): string[] =>
  rows.map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id));

// ─── useFriends — accepted friends with presence + gamification ──────────────

export const useFriends = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.friends.list({ scope: "accepted", studentId }),
    queryFn: async (): Promise<Friend[]> => {
      if (!studentId) return [];

      const { data: rows, error } = await untyped
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${studentId},addressee_id.eq.${studentId}`);
      if (error) throw error;

      const friendIds = otherIds((rows ?? []) as FriendshipRow[], studentId);
      if (friendIds.length === 0) return [];

      const [profilesResult, gamResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, last_seen_at")
          .in("id", friendIds),
        supabase
          .from("student_gamification")
          .select("student_id, xp_total, level, streak_current")
          .in("student_id", friendIds),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (gamResult.error) throw gamResult.error;

      const gamMap = new Map(
        (gamResult.data ?? []).map((g) => [g.student_id, g])
      );

      return (profilesResult.data ?? [])
        .map((p): Friend => {
          const g = gamMap.get(p.id);
          return {
            student_id: p.id,
            full_name: p.full_name ?? "Unknown",
            avatar_url: p.avatar_url,
            last_seen_at: p.last_seen_at,
            xp_total: g?.xp_total ?? 0,
            level: g?.level ?? 1,
            streak_current: g?.streak_current ?? 0,
            online: isOnline(p.last_seen_at),
          };
        })
        .sort(
          (a, b) =>
            Number(b.online) - Number(a.online) || b.xp_total - a.xp_total
        );
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── useFriendRequests — incoming pending requests (I'm the addressee) ───────

export const useFriendRequests = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.friends.list({ scope: "requests", studentId }),
    queryFn: async (): Promise<IncomingFriendRequest[]> => {
      if (!studentId) return [];

      const { data: rows, error } = await untyped
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", studentId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const requesterIds = (rows ?? []).map(
        (r: { requester_id: string }) => r.requester_id
      );
      if (requesterIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", requesterIds);
      if (pErr) throw pErr;

      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map(
        (r: {
          id: string;
          requester_id: string;
          created_at: string;
        }): IncomingFriendRequest => ({
          friendship_id: r.id,
          requester_id: r.requester_id,
          full_name: pMap.get(r.requester_id)?.full_name ?? "Unknown",
          avatar_url: pMap.get(r.requester_id)?.avatar_url ?? null,
          created_at: r.created_at,
        })
      );
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── useClassmateSearch — find same-institution students to add ──────────────

export const useClassmateSearch = (
  query: string,
  studentId: string | undefined
) => {
  const q = query.trim();
  return useQuery({
    queryKey: queryKeys.friends.list({ scope: "search", q, studentId }),
    queryFn: async (): Promise<ClassmateResult[]> => {
      if (!studentId || q.length < 2) return [];
      // profiles SELECT RLS is institution-scoped, so this only returns
      // same-institution students (the send RPC re-validates institution + role).
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("role", "student")
        .neq("id", studentId)
        .ilike("full_name", `%${q}%`)
        .limit(10);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        student_id: p.id,
        full_name: p.full_name ?? "Unknown",
        avatar_url: p.avatar_url,
      }));
    },
    enabled: !!studentId && q.length >= 2,
    staleTime: 30_000,
  });
};

// ─── useFriendsLeaderboard — friends + me, ranked by total XP ────────────────

export const useFriendsLeaderboard = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.friends.list({ scope: "leaderboard", studentId }),
    queryFn: async (): Promise<FriendRankRow[]> => {
      if (!studentId) return [];

      const { data: rows, error } = await untyped
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${studentId},addressee_id.eq.${studentId}`);
      if (error) throw error;

      const ids = new Set<string>([studentId]);
      for (const id of otherIds((rows ?? []) as FriendshipRow[], studentId))
        ids.add(id);
      const idList = [...ids];

      const [gamResult, profilesResult] = await Promise.all([
        supabase
          .from("student_gamification")
          .select("student_id, xp_total, level")
          .in("student_id", idList),
        supabase.from("profiles").select("id, full_name").in("id", idList),
      ]);
      if (gamResult.error) throw gamResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const gMap = new Map(
        (gamResult.data ?? []).map((g) => [g.student_id, g])
      );
      const pMap = new Map(
        (profilesResult.data ?? []).map((p) => [p.id, p.full_name])
      );

      return idList
        .map((id) => ({
          student_id: id,
          full_name: pMap.get(id) ?? "Unknown",
          xp_total: gMap.get(id)?.xp_total ?? 0,
          level: gMap.get(id)?.level ?? 1,
          isMe: id === studentId,
          rank: 0,
        }))
        .sort((a, b) => b.xp_total - a.xp_total)
        .map((row, index) => ({ ...row, rank: index + 1 }));
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useSendFriendRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await untyped.rpc("send_friend_request", {
        p_addressee_id: addresseeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.friends.all });
      toast.success("Friend request sent");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't send friend request"
      ),
  });
};

export const useRespondFriendRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      friendshipId,
      accept,
    }: {
      friendshipId: string;
      accept: boolean;
    }) => {
      const { error } = await untyped.rpc("respond_friend_request", {
        p_friendship_id: friendshipId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.friends.all });
      toast.success(variables.accept ? "Friend added" : "Request declined");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't respond"),
  });
};

export const useRemoveFriend = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const me = user?.id;
  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!me) throw new Error("Not authenticated");
      // DELETE RLS allows either party to remove their own relationship row.
      const { error } = await untyped
        .from("friendships")
        .delete()
        .or(
          `and(requester_id.eq.${me},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${me})`
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.friends.all });
      toast.success("Friend removed");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove friend"
      ),
  });
};
