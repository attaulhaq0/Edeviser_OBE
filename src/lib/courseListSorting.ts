/** Only the existing Course Name field is exposed as a selectable server sort. */
export type CourseNameSort = "asc" | "desc";
export interface CourseSortOrder {
  column: "created_at" | "name" | "id";
  ascending: boolean;
}

/** Validate at the query boundary before constructing any transport request. */
export const getCourseSortOrders = (value: unknown): CourseSortOrder[] => {
  if (value === undefined) return [{ column: "created_at", ascending: false }];
  if (value !== "asc" && value !== "desc")
    throw new Error("Unsupported course Name sort direction");
  return [
    { column: "name", ascending: value === "asc" },
    { column: "id", ascending: true },
  ];
};

/** UI ordering is presentation state, never persisted course/domain ordering. */
export const courseNameSortFromState = (
  state: readonly { id: string; desc: boolean }[]
): CourseNameSort | undefined => {
  if (state.length === 0) return undefined;
  const sort = state[0];
  if (
    state.length !== 1 ||
    sort?.id !== "name" ||
    typeof sort.desc !== "boolean"
  ) {
    throw new Error("Only single-column Course Name sorting is supported");
  }
  return sort.desc ? "desc" : "asc";
};
