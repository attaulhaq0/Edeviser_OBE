// =============================================================================
// StudentFriendsPage — the student "Friends" surface (net-new feature).
// =============================================================================
//
// A privacy-appropriate adaptation of Duolingo's friends system for education:
// mutual friend requests, scoped to the same institution, with online presence.
// Composed from `@/design-system` primitives following the leaderboard-list
// archetype (the prototype has no dedicated friends screen). Wired to the real
// friends hooks (useFriends & co.); no faked data.
//
// Sections: add-friends search · incoming requests · online-now · all friends.
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Flame, Search, UserPlus, Users, X } from "lucide-react";

import { Button, Input, PageHeader, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import {
  useClassmateSearch,
  useFriendRequests,
  useFriends,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
  type Friend,
} from "@/hooks/useFriends";
import { cn } from "@/lib/utils";

const CARD =
  "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Brand-gradient avatar with an online presence dot. */
const FriendAvatar = ({
  name,
  online,
  size = "md",
}: {
  name: string;
  online?: boolean;
  size?: "sm" | "md";
}) => (
  <div className="relative shrink-0">
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-white",
        size === "sm" ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-xs"
      )}
      style={{ background: "var(--brand-gradient)" }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
    {online && (
      <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
    )}
  </div>
);

const StudentFriendsPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const friends = useFriends(studentId);
  const requests = useFriendRequests(studentId);
  const sendRequest = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const removeFriend = useRemoveFriend();

  const [query, setQuery] = useState("");
  const search = useClassmateSearch(query, studentId);

  const friendList = friends.data ?? [];
  const onlineFriends = friendList.filter((f) => f.online);
  const requestList = requests.data ?? [];

  return (
    <div className="w-full space-y-4">
      <div>
        <PageHeader title={t("friends.title", "Friends")} />
        <p className="mt-1 text-sm text-gray-500">
          {t(
            "friends.subtitle",
            "Connect with classmates, cheer each other on, and climb together."
          )}
        </p>
      </div>

      {/* ── Add friends ── */}
      <section className={cn(CARD, "p-4")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "friends.searchPlaceholder",
              "Search classmates by name"
            )}
            className="ps-9"
            aria-label={t(
              "friends.searchPlaceholder",
              "Search classmates by name"
            )}
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {search.isPending ? (
              <Shimmer className="h-12 rounded-xl" />
            ) : (search.data ?? []).length > 0 ? (
              (search.data ?? []).map((c) => (
                <div
                  key={c.student_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5"
                >
                  <FriendAvatar name={c.full_name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                    {c.full_name}
                  </span>
                  <Button
                    variant="tactile"
                    className="h-8 px-3 text-xs"
                    disabled={sendRequest.isPending}
                    onClick={() => sendRequest.mutate(c.student_id)}
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("friends.add", "Add")}
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-2 text-center text-sm text-gray-500">
                {t("friends.noMatches", "No classmates match that name.")}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Incoming requests ── */}
      {requestList.length > 0 && (
        <section className={cn(CARD, "p-4")}>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black tracking-tight text-slate-900">
            <UserPlus className="h-4 w-4 text-sky-600" aria-hidden="true" />
            {t("friends.requests", "Friend requests")}
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              {requestList.length}
            </span>
          </h2>
          <div className="space-y-2">
            {requestList.map((r) => (
              <div key={r.friendship_id} className="flex items-center gap-3">
                <FriendAvatar name={r.full_name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                  {r.full_name}
                </span>
                <Button
                  variant="tactile"
                  className="h-8 px-3 text-xs"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      friendshipId: r.friendship_id,
                      accept: true,
                    })
                  }
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("friends.accept", "Accept")}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      friendshipId: r.friendship_id,
                      accept: false,
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("friends.decline", "Decline")}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Online now ── */}
      {onlineFriends.length > 0 && (
        <section className={cn(CARD, "p-4")}>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black tracking-tight text-slate-900">
            <span
              className="h-2 w-2 rounded-full bg-green-500"
              aria-hidden="true"
            />
            {t("friends.onlineNow", "Online now")}
            <span className="text-[11px] font-bold text-gray-400">
              {onlineFriends.length}
            </span>
          </h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
            {onlineFriends.map((f) => (
              <div
                key={f.student_id}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <FriendAvatar name={f.full_name} online />
                <span className="w-full truncate text-center text-[11px] text-gray-600">
                  {f.full_name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── All friends ── */}
      <section className={cn(CARD, "p-4")}>
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black tracking-tight text-slate-900">
          <Users className="h-4 w-4 text-sky-600" aria-hidden="true" />
          {t("friends.allFriends", "All friends")}
          {friendList.length > 0 && (
            <span className="text-[11px] font-bold text-gray-400">
              {friendList.length}
            </span>
          )}
        </h2>
        {friends.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : friendList.length > 0 ? (
          <div className="space-y-2">
            {friendList.map((f) => (
              <FriendRow
                key={f.student_id}
                friend={f}
                onRemove={() => removeFriend.mutate(f.student_id)}
                removing={removeFriend.isPending}
                labels={{
                  level: t("friends.level", "Lv {{n}}", { n: f.level }),
                  remove: t("friends.remove", "Remove"),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Users className="h-6 w-6 text-blue-500" aria-hidden="true" />
            </div>
            <p className="max-w-xs text-sm text-gray-500">
              {t(
                "friends.empty",
                "No friends yet — search for a classmate above to send your first request."
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

const FriendRow = ({
  friend,
  onRemove,
  removing,
  labels,
}: {
  friend: Friend;
  onRemove: () => void;
  removing: boolean;
  labels: { level: string; remove: string };
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5">
    <FriendAvatar name={friend.full_name} online={friend.online} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-gray-900">
        {friend.full_name}
      </p>
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className="font-bold text-blue-600">{labels.level}</span>
        {friend.streak_current > 0 && (
          <span className="inline-flex items-center gap-0.5 text-orange-600">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {friend.streak_current}
          </span>
        )}
        <span className="font-semibold text-amber-600">
          {friend.xp_total.toLocaleString()} XP
        </span>
      </div>
    </div>
    <Button
      variant="ghost"
      className="h-8 px-2 text-xs text-gray-400 hover:text-red-600"
      disabled={removing}
      onClick={onRemove}
      aria-label={labels.remove}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  </div>
);

export default StudentFriendsPage;
