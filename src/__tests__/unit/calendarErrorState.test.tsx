// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";

const state = {
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/hooks/useCalendar", () => ({
  useCalendarEvents: () => ({
    data: [],
    isLoading: false,
    isError: state.isError,
    refetch: state.refetch,
  }),
}));

import CalendarView from "@/pages/shared/CalendarView";

const renderView = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <CalendarView />
      </MemoryRouter>
    </I18nextProvider>
  );

describe("CalendarView error state", () => {
  beforeEach(() => {
    state.isError = false;
    state.refetch.mockReset();
  });

  it("offers a retry when calendar data fails to load", () => {
    state.isError = true;
    renderView();

    expect(screen.getByText(i18n.t("common:errors.generic"))).toBeTruthy();
    screen
      .getByRole("button", { name: i18n.t("common:buttons.retry") })
      .click();
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});
