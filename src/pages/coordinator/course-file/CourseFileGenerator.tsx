// =============================================================================
// CourseFileGenerator — production course-file / accreditation surface (redesigned UI)
// =============================================================================
// The redesigned experience lives in `CoordinatorAccreditationNew`, re-exported
// here so the route path (`.../course-file/CourseFileGenerator`) stays stable.
// The legacy generator and its feature-flag wrapper were removed in the
// UI-migration cleanup.
// =============================================================================

export { default } from "./CoordinatorAccreditationNew";
