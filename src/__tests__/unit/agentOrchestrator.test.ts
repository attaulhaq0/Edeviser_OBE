import { describe, expect, it, vi } from "vitest";

import { getAgenticConfig } from "../../../supabase/functions/_shared/ai/config";
import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";
import {
  AgentOrchestratorError,
  runAgentOrchestrator,
} from "../../../supabase/functions/_shared/ai/orchestrator";
import type {
  AICompletionResponse,
  AIProvider,
} from "../../../supabase/functions/_shared/ai/provider";

const context: AgentExecutionContext = {
  requestId: "11111111-1111-4111-8111-111111111111",
  runId: "22222222-2222-4222-8222-222222222222",
  sessionId: "33333333-3333-4333-8333-333333333333",
  specialist: "tutor",
  identity: {
    userId: "44444444-4444-4444-8444-444444444444",
    role: "student",
    institutionId: "55555555-5555-4555-8555-555555555555",
  },
  page: {
    route: "/student/course",
    studentId: "44444444-4444-4444-8444-444444444444",
    courseId: "66666666-6666-4666-8666-666666666666",
  },
};

const config = (overrides: Record<string, string> = {}) =>
  getAgenticConfig({
    get: (name: string) =>
      ({
        AI_FEATURE_ENABLED: "true",
        AI_DAILY_BUDGET_USD: "10",
        ...overrides,
      }[name]),
  });

const response = (
  toolCalls: AICompletionResponse["toolCalls"] = [],
  content = "done"
): AICompletionResponse => ({
  content,
  model: "deepseek-v4-flash",
  finishReason: toolCalls.length ? "tool_calls" : "stop",
  toolCalls,
});

const dependencies = (provider: AIProvider, configOverride = config()) => ({
  config: configOverride,
  provider,
  dataSource: {
    authorizeScope: vi.fn().mockResolvedValue(true),
    executeRead: vi.fn().mockResolvedValue({ records: [{ id: "safe" }] }),
  },
  proposalAuthorizer: {
    authorizeProposal: vi.fn().mockResolvedValue({
      studentId: context.page.studentId,
      courseId: context.page.courseId,
      requiredApproverUserId: context.identity.userId,
    }),
  },
  proposalStore: {
    create: vi.fn(async (proposal) => ({
      ...proposal,
      id: "77777777-7777-4777-8777-777777777777",
    })),
  },
  audit: { toolAttempt: vi.fn().mockResolvedValue(undefined) },
  request: { message: "Help me understand my course", context },
});

describe("agent orchestrator execution boundary", () => {
  it("treats tool and RAG output as untrusted data", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: "call-1",
            name: "get_course_mastery",
            arguments: { courseId: context.page.courseId },
          },
        ])
      )
      .mockResolvedValueOnce(response([], "Evidence explained safely"));
    const result = await runAgentOrchestrator(
      dependencies({ name: "deepseek", complete })
    );
    expect(result.response).toBe("Evidence explained safely");
    const secondRequest = complete.mock.calls[1]?.[0];
    expect(secondRequest.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          content: expect.stringContaining("UNTRUSTED_TOOL_DATA"),
        }),
      ])
    );
  });

  it("fails the run when a tool-attempt audit record cannot be stored", async () => {
    const complete = vi.fn().mockResolvedValue(
      response([
        {
          id: "call-audit",
          name: "get_course_mastery",
          arguments: { courseId: context.page.courseId },
        },
      ])
    );
    const deps = dependencies({ name: "deepseek", complete });
    deps.audit.toolAttempt.mockRejectedValue(new Error("audit unavailable"));
    await expect(runAgentOrchestrator(deps)).rejects.toThrow(
      "audit unavailable"
    );
  });

  it("generates a proposal and never executes a protected action", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: "call-1",
            name: "propose_protected_action",
            arguments: {
              actionType: "create_goal",
              payload: { title: "Review CLO 1" },
              reason: "Student should approve this personal goal.",
              evidence: [{ kind: "outcome", id: "clo-1" }],
              studentId: context.identity.userId,
            },
          },
        ])
      )
      .mockResolvedValueOnce(
        response([], "I prepared a proposal for your review.")
      );
    const deps = dependencies({ name: "deepseek", complete });
    const result = await runAgentOrchestrator(deps);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      status: "pending",
      risk: "protected",
    });
    const toolMessage = complete.mock.calls[1]?.[0].messages.find(
      (message: { role: string }) => message.role === "tool"
    );
    expect(toolMessage.content).toContain('"protectedActionExecuted":false');
  });

  it("enforces maximum tool calls, steps, and specialist transfers", async () => {
    const tooManyCalls: AIProvider = {
      name: "deepseek",
      complete: vi.fn().mockResolvedValue(
        response([
          {
            id: "1",
            name: "get_course_mastery",
            arguments: { courseId: context.page.courseId },
          },
          {
            id: "2",
            name: "get_course_mastery",
            arguments: { courseId: context.page.courseId },
          },
        ])
      ),
    };
    await expect(
      runAgentOrchestrator(
        dependencies(tooManyCalls, config({ AI_MAX_TOOL_CALLS: "1" }))
      )
    ).rejects.toMatchObject({ kind: "max_tool_calls" });

    const repeated: AIProvider = {
      name: "deepseek",
      complete: vi.fn().mockResolvedValue(
        response([
          {
            id: "1",
            name: "get_course_mastery",
            arguments: { courseId: context.page.courseId },
          },
        ])
      ),
    };
    await expect(
      runAgentOrchestrator(
        dependencies(repeated, config({ AI_MAX_TOOL_STEPS: "1" }))
      )
    ).rejects.toMatchObject({ kind: "max_tool_steps" });

    const transfers: AIProvider = {
      name: "deepseek",
      complete: vi.fn().mockResolvedValue(
        response([
          {
            id: "1",
            name: "transfer_specialist",
            arguments: { specialist: "mastery" },
          },
        ])
      ),
    };
    await expect(
      runAgentOrchestrator(
        dependencies(transfers, config({ AI_MAX_AGENT_TRANSFERS: "0" }))
      )
    ).rejects.toBeInstanceOf(AgentOrchestratorError);
  });

  it("rejects missing context and unknown or unauthorized tool requests", async () => {
    const unknown: AIProvider = {
      name: "deepseek",
      complete: vi
        .fn()
        .mockResolvedValue(
          response([
            { id: "1", name: "raw_sql", arguments: { sql: "select *" } },
          ])
        ),
    };
    await expect(
      runAgentOrchestrator(dependencies(unknown))
    ).rejects.toMatchObject({
      kind: "unknown_tool",
    });
  });
});
