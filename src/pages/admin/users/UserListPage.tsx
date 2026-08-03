import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  AdminFilterPill,
  AdminStatCard,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
  adminTableClass,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useSoftDeleteUser, useUsers } from "@/hooks/useUsers";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/app";

const ROLE_OPTIONS: Array<{ label: string; value: UserRole | "" }> = [
  { label: "All", value: "" },
  { label: "Teachers", value: "teacher" },
  { label: "Coordinators", value: "coordinator" },
  { label: "Students", value: "student" },
  { label: "Parents", value: "parent" },
];

const roleTone = (role: UserRole) => {
  if (role === "teacher" || role === "parent") return "blue" as const;
  if (role === "coordinator") return "amber" as const;
  if (role === "student") return "green" as const;
  return "slate" as const;
};

const useLinkedParentCount = (institutionId: string | null | undefined) =>
  useQuery({
    queryKey: ["admin", "people", "linked-parents", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      if (!institutionId) return 0;
      const { data: students, error: studentsError } = await supabase
        .from("profiles")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("role", "student");
      if (studentsError) throw studentsError;
      const studentIds = (students ?? []).map((student) => student.id);
      if (studentIds.length === 0) return 0;
      const { data: links, error: linksError } = await supabase
        .from("parent_student_links")
        .select("parent_id")
        .in("student_id", studentIds)
        .eq("verified", true);
      if (linksError) throw linksError;
      return new Set((links ?? []).map((link) => link.parent_id)).size;
    },
  });

const UserListPage = () => {
  const navigate = useNavigate();
  const { institutionId } = useAuth();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [role, setRole] = useQueryState("role", parseAsString.withDefault(""));
  const [userToDeactivate, setUserToDeactivate] = useState<Profile | null>(
    null
  );
  const [page, setPage] = useState(1);
  const aggregate = useAdminDashboardAggregate(institutionId);
  const linkedParents = useLinkedParentCount(institutionId);
  const users = useUsers({
    search: search || undefined,
    role: role || undefined,
    page,
  });
  const softDeleteMutation = useSoftDeleteUser();

  const roleCounts = aggregate.data?.usersByRole ?? {};
  const rows = users.data?.data ?? [];
  const roleLabel = useMemo(
    () => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "All",
    [role]
  );

  const setRoleFilter = (nextRole: UserRole | "") => {
    void setRole(nextRole || null);
    setPage(1);
  };

  return (
    <div className={adminPageClass}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            People
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Roles, access &amp; onboarding across your institution.
          </p>
        </div>
        <Button
          type="button"
          variant="tactile"
          size="sm"
          onClick={() => navigate("/admin/users/invite")}
        >
          <Plus className="size-4" />
          Invite
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard label="Students" value={roleCounts.student ?? 0} />
        <AdminStatCard label="Teachers" value={roleCounts.teacher ?? 0} />
        <AdminStatCard
          label="Coordinators"
          value={roleCounts.coordinator ?? 0}
        />
        <AdminStatCard label="Parents linked" value={linkedParents.data ?? 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_OPTIONS.map((option) => (
          <AdminFilterPill
            key={option.value || "all"}
            active={role === option.value}
            onClick={() => setRoleFilter(option.value)}
          >
            {option.label}
          </AdminFilterPill>
        ))}
        <div className="relative ms-auto min-w-56 max-w-sm flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              void setSearch(event.target.value || null);
              setPage(1);
            }}
            placeholder={`Search ${roleLabel.toLowerCase()}...`}
            className="h-9 rounded-xl border-slate-200 bg-white ps-9 text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/users/import")}
        >
          <Upload className="size-4" />
          Import CSV
        </Button>
      </div>

      <div className={`${adminCardClass} overflow-hidden p-0`}>
        <div className="overflow-x-auto">
          <table className={adminTableClass}>
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-start">Name</th>
                <th className="px-4 py-3 text-start">Role</th>
                <th className="px-4 py-3 text-start">Department</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{user.full_name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <AdminStatusPill tone={roleTone(user.role)}>
                      {user.role}
                    </AdminStatusPill>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.department || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AdminStatusPill tone={user.is_active ? "green" : "red"}>
                      {user.is_active ? "● Active" : "Inactive"}
                    </AdminStatusPill>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs font-bold text-blue-600"
                        onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                      >
                        Manage
                      </Button>
                      {user.is_active ? (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs font-bold text-slate-500"
                          onClick={() => setUserToDeactivate(user)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.isLoading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No users match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            {users.isLoading
              ? "Loading people…"
              : `${users.data?.count ?? 0} people`}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                !users.data || page * users.data.pageSize >= users.data.count
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!userToDeactivate}
        onOpenChange={(open) => !open && setUserToDeactivate(null)}
        title="Deactivate user"
        description={`Deactivate ${
          userToDeactivate?.full_name ?? "this user"
        }? They will lose access to the platform.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={softDeleteMutation.isPending}
        onConfirm={() => {
          if (!userToDeactivate) return;
          softDeleteMutation.mutate(userToDeactivate.id, {
            onSuccess: () => {
              toast.success(`${userToDeactivate.full_name} deactivated`);
              setUserToDeactivate(null);
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </div>
  );
};

export default UserListPage;
