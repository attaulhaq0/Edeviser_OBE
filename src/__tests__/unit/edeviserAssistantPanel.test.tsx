// Feature: EdeviserAssistantPanel (frontend-plan.md §Component set, tasks 3.1 — Wave D2).
// Fail-closed shell contract tests: unmapped route ⇒ renders nothing,
// mapped-but-unhosted row ⇒ renders nothing, hosts for non-permitted surfaces
// are dropped silently, permitted surfaces render in registry-surface order,
// the resolved row is handed to hosts, and the approval-ceiling badge reflects
// the row's informational ceiling. Real en bundles resolve translations
// (registered via the "@/lib/i18n" import side effect).

import "@/lib/i18n";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PageCapabilityRow } from "@/ai/capabilities/types";
import EdeviserAssistantPanel, {
  type EdeviserAssistantPanelProps,
  type HostedSurfaceProps,
} from "@/ai/components/EdeviserAssistantPanel";

// ─── Harness ─────────────────────────────────────────────────────────────────

const makeHost = (label: string) => () => <div>{label}</div>;

const ALL_HOSTS: NonNullable<EdeviserAssistantPanelProps["surfaceHosts"]> = {
  conversation: makeHost("CONVO"),
  suggestions: makeHost("SUGG"),
  "insight-cards": makeHost("INSIGHT"),
  "approval-inbox": makeHost("APPROVAL"),
  "twin-summary": makeHost("TWIN"),
  "alignment-summary": makeHost("ALIGN"),
};

const captureRow = vi.fn<(row: PageCapabilityRow) => void>(() => undefined);

const RowSpyHost = ({ row }: HostedSurfaceProps) => {
  captureRow(row);
  return <div>SPY-SURFACE</div>;
};

const renderAt = (
  path: string,
  hosts?: EdeviserAssistantPanelProps["surfaceHosts"],
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <EdeviserAssistantPanel surfaceHosts={hosts} />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  captureRow.mockClear();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("EdeviserAssistantPanel", () => {
  it("renders NOTHING on routes without a capability row (fail-closed)", () => {
    for (const path of ["/login", "/student/marketplace", "/admin/settings"]) {
      const view = renderAt(path, ALL_HOSTS);
      expect(view.container.querySelector("[data-page-pattern]")).toBeNull();
      expect(view.container.textContent).toBe("");
      view.unmount();
    }
  });

  it("renders NOTHING when a row exists but no permitted surface is hosted", () => {
    const { container } = renderAt("/student");
    expect(container.querySelector("[data-page-pattern]")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders the panel once a permitted surface is hosted", () => {
    const { container } = renderAt("/student", {
      "twin-summary": makeHost("TWIN"),
    });

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-label")).toBe("Edeviser Assistant");
    expect(section?.dataset.pagePattern).toBe("/student");
    expect(section?.dataset.surfaces).toBe("twin-summary");

    expect(screen.getByText("Edeviser Assistant")).toBeInTheDocument();
    expect(screen.getByText("Context-aware help scoped to this page")).toBeInTheDocument();
    // Ceiling badge mirrors the row's informational ceiling ("none").
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.getByText("TWIN")).toBeInTheDocument();
  });

  it("drops hosts for surfaces the row does not permit", () => {
    // /student permits twin-summary / alignment-summary / suggestions — NOT conversation.
    const { container } = renderAt("/student", {
      "twin-summary": makeHost("TWIN"),
      conversation: makeHost("CONVO"),
    });

    expect(container.querySelector("section")?.dataset.surfaces).toBe(
      "twin-summary",
    );
    expect(screen.getByText("TWIN")).toBeInTheDocument();
    expect(screen.queryByText("CONVO")).toBeNull();
  });

  it("renders hosted surfaces in registry order on the longest-match course row", () => {
    const { container } = renderAt("/student/courses/c-42", {
      conversation: makeHost("CONVO"),
      "twin-summary": makeHost("TWIN"),
      "insight-cards": makeHost("INSIGHT"),
    });

    const section = container.querySelector("section");
    // Longest-match precedence resolved the :param course row, and the
    // resolved pattern (not the concrete URL) is surfaced.
    expect(section?.dataset.pagePattern).toBe("/student/courses/:courseId");
    // alignment-summary is permitted but unhosted → omitted from rendering.
    expect(section?.dataset.surfaces).toBe("twin-summary,conversation");

    const text = container.textContent ?? "";
    expect(text).not.toContain("INSIGHT");
    const twinIndex = text.indexOf("TWIN");
    const convoIndex = text.indexOf("CONVO");
    expect(twinIndex).toBeGreaterThanOrEqual(0);
    expect(convoIndex).toBeGreaterThan(twinIndex);
  });

  it("reflects a non-none approval ceiling as an informational badge", () => {
    renderAt("/teacher/dashboard", {
      "insight-cards": makeHost("INSIGHT"),
    });

    expect(screen.getByText("Needs teacher approval")).toBeInTheDocument();
    expect(screen.getByText("INSIGHT")).toBeInTheDocument();
  });

  it("hands the resolved capability row to hosted surfaces", () => {
    renderAt("/teacher/dashboard", {
      "approval-inbox": RowSpyHost,
    });

    expect(captureRow).toHaveBeenCalledWith(
      expect.objectContaining({
        pathPattern: "/teacher/dashboard",
        approvalCeiling: "teacher",
        roles: ["teacher"],
      }),
    );
  });
});
