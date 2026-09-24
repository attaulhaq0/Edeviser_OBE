/**
 * L3 composition — Parent.
 *
 * Role pages, widgets, and flows composed from `@/design-system` primitives +
 * patterns and bound to EXISTING hooks in `src/hooks` (no new backend). Growth/
 * wellbeing framing — never raw grades (mirrors the parent aggregate hook).
 *
 * Public feature boundary. Route targets consume the attendance rail here;
 * other parent compositions remain subject to the shared-owner migration.
 */
export { ParentAttendanceRail } from "@/features/parent/attendance/ParentAttendanceRail";
