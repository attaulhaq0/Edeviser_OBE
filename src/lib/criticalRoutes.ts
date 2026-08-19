const requiredId = (value: string, label: string): string => {
  if (!value.trim()) throw new Error(`${label} is required`);
  return encodeURIComponent(value);
};

export const criticalRouteSegments = {
  teacher: {
    dashboard: "dashboard",
    assignments: "assignments",
    gradingQueue: "grading",
    gradingSubmission: "grading/:submissionId",
  },
  student: {
    dashboard: "dashboard",
    assignments: "assignments",
    assignmentDetail: "assignments/:id",
    xpHistory: "xp-history",
  },
} as const;

export const criticalRoutes = {
  teacher: {
    dashboard: "/teacher/dashboard",
    assignments: "/teacher/assignments",
    gradingQueue: "/teacher/grading",
    gradingSubmission: (submissionId: string): string =>
      `/teacher/grading/${requiredId(submissionId, "submissionId")}`,
  },
  student: {
    dashboard: "/student/dashboard",
    assignments: "/student/assignments",
    assignmentDetail: (assignmentId: string): string =>
      `/student/assignments/${requiredId(assignmentId, "assignmentId")}`,
    xpHistory: "/student/xp-history",
  },
} as const;
