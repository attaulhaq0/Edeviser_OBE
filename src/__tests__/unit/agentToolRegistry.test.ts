import { describe, expect, it, vi } from "vitest";

import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";
import {
  executeRegisteredTool,
  registeredToolsForRole,
  ToolBoundaryError,
} from "../../../supabase/functions/_shared/ai/tools/registry";

const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(
    3
  )}-${digit.repeat(12)}`;
const context = (
  role: AgentExecutionContext["identity"]["role"]
): AgentExecutionContext => ({
  requestId: id("1"),
  runId: id("2"),
  sessionId: id("3"),
  specialist:
    role === "parent"
      ? "parent"
      : role === "admin"
      ? "admin"
      : role === "coordinator"
      ? "coordinator"
      : role === "teacher"
      ? "teacher"
      : "tutor",
  identity: { userId: id("4"), role, institutionId: id("5") },
  page: {
    route: "/test",
    studentId: id("4"),
    courseId: id("6"),
    programId: id("7"),
  },
});

describe("typed read-tool registry", () => {
  it("represents all five role policies without granting parent RAG access", () => {
    const roles = [
      "student",
      "teacher",
      "parent",
      "coordinator",
      "admin",
    ] as const;
    for (const role of roles)
      expect(registeredToolsForRole(role).length).toBeGreaterThan(0);
    expect(registeredToolsForRole("parent").map((tool) => tool.name)).toEqual([
      "get_parent_child_progress",
    ]);
    expect(
      registeredToolsForRole("student").map((tool) => tool.name)
    ).toContain("search_course_materials");
  });

  it("rejects unknown tools, bad arguments, unauthorized roles, and scope failures", async () => {
    const dataSource = {
      authorizeScope: vi.fn().mockResolvedValue(false),
      executeRead: vi.fn(),
    };
    await expect(
      executeRegisteredTool("raw_sql", {}, context("admin"), dataSource)
    ).rejects.toMatchObject({ kind: "unknown_tool" });
    await expect(
      executeRegisteredTool("constructor", {}, context("admin"), dataSource)
    ).rejects.toMatchObject({ kind: "unknown_tool" });
    await expect(
      executeRegisteredTool(
        "get_course_mastery",
        { courseId: "not-a-uuid" },
        context("student"),
        dataSource
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    await expect(
      executeRegisteredTool(
        "get_course_mastery",
        { courseId: id("6") },
        {
          ...context("student"),
          page: { route: "/test", studentId: id("4") },
        },
        dataSource
      )
    ).rejects.toMatchObject({ kind: "missing_context" });
    await expect(
      executeRegisteredTool(
        "get_course_mastery",
        { courseId: id("6"), studentId: "not-a-uuid" },
        context("student"),
        dataSource
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    await expect(
      executeRegisteredTool(
        "get_admin_institution_context",
        {},
        context("student"),
        dataSource
      )
    ).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(
      executeRegisteredTool(
        "get_course_mastery",
        { courseId: id("6") },
        context("student"),
        dataSource
      )
    ).rejects.toBeInstanceOf(ToolBoundaryError);
    expect(dataSource.executeRead).not.toHaveBeenCalled();
  });

  it("validates tool outputs before returning them to the model", async () => {
    const dataSource = {
      authorizeScope: vi.fn().mockResolvedValue(true),
      executeRead: vi.fn().mockResolvedValue(["unexpected-array"]),
    };
    await expect(
      executeRegisteredTool(
        "get_course_mastery",
        { courseId: id("6") },
        context("student"),
        dataSource
      )
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });
});
