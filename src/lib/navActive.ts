import type { UserRole } from "@/types/app";

/** Finite presentation aliases for existing router entries; no route/guard changes. */
export const navActiveAliases: Partial<
  Record<UserRole, Record<string, string>>
> = {
  admin: {
    "/admin/profile": "/admin/settings/profile",
    "/admin/structure": "/admin/departments",
    "/admin/settings/institution": "/admin/departments",
  },
  coordinator: {
    "/coordinator/profile": "/coordinator/settings/profile",
    "/coordinator/outcomes": "/coordinator/plos",
  },
  teacher: { "/teacher/content": "/teacher/modules" },
  parent: {
    "/parent/settings/profile": "/parent/profile",
    "/parent/notifications": "/parent/communications",
  },
};

export const isNavDestinationActive = (
  pathname: string,
  destination: string,
  role: UserRole
): boolean => {
  const current = navActiveAliases[role]?.[pathname] ?? pathname;
  if (current === destination) return true;
  // Dashboard/home must not claim every nested route in the role.
  return (
    destination !== `/${role}/dashboard` &&
    destination !== `/${role}` &&
    current.startsWith(`${destination}/`)
  );
};
