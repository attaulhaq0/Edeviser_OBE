// @vitest-environment happy-dom
// =============================================================================
// Timetable — empty-state fallback & seed-failure resilience (Task 19.4)
//
// Covers Requirements 12 & 13:
//  - R12.6: the genuine zero-data fallback uses the shared EmptyState library
//           (NoTimetable) rather than an inline ad-hoc empty state.
//  - R12.8: if the seed migrations fail to run, the Timetable surface SHALL
//           still load and render its empty-state component rather than being
//           blocked from loading.
//  - R13.3: when a Student is enrolled in courses but assigned to no timetabled
//           section, the surface displays the shared timetable empty state.
//
// TimetableView is verified for the zero-data path (the slots hook returns [])
// and for "no crash" mounting when the query produced no data at all
// (seed-absent: data === undefined, which the surface defaults to []).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { TimetableSlot } from "@/hooks/useTimetable";

// ─── Mock state controls ─────────────────────────────────────────────────────

interface MockState {
  // `undefined` models a query that produced no data at all (seed-absent);
  // an empty array models a genuine "no section assigned" zero-data result.
  slots: TimetableSlot[] | undefined;
  isLoading: boolean;
}

const state: MockState = {
  slots: [],
  isLoading: false,
};

const resetState = () => {
  state.slots = [];
  state.isLoading = false;
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useTimetable", () => ({
  useTimetableSlots: () => ({ data: state.slots, isLoading: state.isLoading }),
}));

import TimetableView from "@/pages/shared/TimetableView";

const renderView = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TimetableView />
      </MemoryRouter>
    </I18nextProvider>
  );

const noTimetableTitle = i18n.t("common:empty.noTimetable.title");
const timetableTitle = i18n.t("common:timetable.title");

beforeEach(() => {
  resetState();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Timetable empty-state fallback (R12.6, R12.8, R13.3)", () => {
  it("renders the shared NoTimetable empty state when no section is assigned (zero data)", () => {
    state.slots = [];
    renderView();

    // Surface still mounts (heading visible) — seed-failure resilience.
    expect(screen.getByText(timetableTitle)).toBeTruthy();
    // Shared EmptyState_Library component is rendered for the schedule grid.
    expect(screen.getByText(noTimetableTitle)).toBeTruthy();
  });

  it("still loads (no crash) when the query produced no data (seed-absent)", () => {
    // Simulates seed migrations not having run: the slots query has no data.
    state.slots = undefined;
    renderView();

    expect(screen.getByText(timetableTitle)).toBeTruthy();
    expect(screen.getByText(noTimetableTitle)).toBeTruthy();
  });
});
